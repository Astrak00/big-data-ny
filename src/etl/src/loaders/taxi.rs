//! Taxi trip data loader - reads from Parquet files

use anyhow::Result;
use arrow::array::{Array, Float64Array, Int32Array, Int64Array, TimestampMillisecondArray};
use deadpool_postgres::Pool;
use indicatif::{ProgressBar, ProgressStyle};
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;
use std::fs::File;
use std::path::Path;
use tracing::info;

pub async fn load(pool: &Pool, source: &str, limit: usize) -> Result<()> {
    info!("Loading taxi data from: {}", source);
    
    let source_path = Path::new(source);
    
    // Check if it's a URL or file
    let file_path = if source.starts_with("http") {
        // Download to temp file
        let temp_path = std::env::temp_dir().join("taxi_data.parquet");
        crate::extractors::download_file(source, &temp_path).await?;
        temp_path
    } else {
        source_path.to_path_buf()
    };
    
    // Open parquet file
    let file = File::open(&file_path)?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(file)?;
    let reader = builder.with_batch_size(10000).build()?;
    
    let client = pool.get().await?;
    
    // Clear existing data
    client.execute("TRUNCATE TABLE taxi_trips", &[]).await?;
    
    let mut total_records = 0usize;
    let pb = ProgressBar::new_spinner();
    pb.set_style(ProgressStyle::default_spinner()
        .template("{spinner:.green} [{elapsed_precise}] {msg}")?);
    
    for batch_result in reader {
        let batch = batch_result?;
        let num_rows = batch.num_rows();
        
        if limit > 0 && total_records >= limit {
            break;
        }
        
        // Get columns
        let vendor_col = batch.column_by_name("VendorID")
            .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
        let pickup_col = batch.column_by_name("tpep_pickup_datetime")
            .and_then(|c| c.as_any().downcast_ref::<TimestampMillisecondArray>());
        let dropoff_col = batch.column_by_name("tpep_dropoff_datetime")
            .and_then(|c| c.as_any().downcast_ref::<TimestampMillisecondArray>());
        let passenger_col = batch.column_by_name("passenger_count")
            .and_then(|c| c.as_any().downcast_ref::<Int64Array>());
        let distance_col = batch.column_by_name("trip_distance")
            .and_then(|c| c.as_any().downcast_ref::<Float64Array>());
        let pu_location_col = batch.column_by_name("PULocationID")
            .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
        let do_location_col = batch.column_by_name("DOLocationID")
            .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
        let fare_col = batch.column_by_name("fare_amount")
            .and_then(|c| c.as_any().downcast_ref::<Float64Array>());
        let total_col = batch.column_by_name("total_amount")
            .and_then(|c| c.as_any().downcast_ref::<Float64Array>());
        
        // Build batch insert
        let rows_to_insert = if limit > 0 {
            std::cmp::min(num_rows, limit - total_records)
        } else {
            num_rows
        };
        
        for i in 0..rows_to_insert {
            let vendor_id = vendor_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let pickup_ts = pickup_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let dropoff_ts = dropoff_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let passengers = passenger_col.and_then(|c| if c.is_valid(i) { Some(c.value(i) as i32) } else { None });
            let distance = distance_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let pu_location = pu_location_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let do_location = do_location_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let fare = fare_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let total = total_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            
            // Convert timestamps to chrono DateTime
            let pickup_dt = pickup_ts.map(|ts| {
                chrono::DateTime::from_timestamp_millis(ts)
                    .unwrap_or_else(|| chrono::Utc::now())
                    .naive_utc()
            });
            let dropoff_dt = dropoff_ts.map(|ts| {
                chrono::DateTime::from_timestamp_millis(ts)
                    .unwrap_or_else(|| chrono::Utc::now())
                    .naive_utc()
            });
            
            if let Some(pickup) = pickup_dt {
                // Use LEFT JOIN with COALESCE to handle missing zones
                // Falls back to zone 264 (Unknown) if zone doesn't exist
                client.execute(
                    r#"
                    INSERT INTO taxi_trips (
                        vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
                        trip_distance, pickup_location_id, dropoff_location_id,
                        pickup_point, dropoff_point, fare_amount, total_amount
                    )
                    SELECT 
                        $1, $2, $3, $4, $5, $6, $7,
                        COALESCE(pu.centroid, fallback.centroid),
                        COALESCE(do_zone.centroid, fallback.centroid),
                        $8, $9
                    FROM 
                        taxi_zones fallback
                        LEFT JOIN taxi_zones pu ON pu.location_id = $6
                        LEFT JOIN taxi_zones do_zone ON do_zone.location_id = $7
                    WHERE fallback.location_id = 264
                    "#,
                    &[
                        &vendor_id, &pickup, &dropoff_dt, &passengers,
                        &distance, &pu_location, &do_location,
                        &fare, &total
                    ]
                ).await?;
            }
        }
        
        total_records += rows_to_insert;
        pb.set_message(format!("Loaded {} taxi records", total_records));
    }
    
    pb.finish_with_message(format!("Completed loading {} taxi records", total_records));
    
    // Record ETL metadata
    client.execute(
        "INSERT INTO etl_metadata (table_name, source_file, records_loaded, started_at, completed_at, status) 
         VALUES ($1, $2, $3, NOW(), NOW(), 'completed')",
        &[&"taxi_trips", &source, &(total_records as i64)]
    ).await?;
    
    info!("Taxi data loaded: {} records", total_records);
    Ok(())
}
