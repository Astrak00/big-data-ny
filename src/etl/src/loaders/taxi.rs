//! Taxi trip data loader - reads from Parquet files with batch optimization

use anyhow::Result;
use arrow::array::{Array, Float64Array, Int32Array, Int64Array, TimestampMicrosecondArray};
use deadpool_postgres::Pool;
use indicatif::{ProgressBar, ProgressStyle};
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;
use rand::seq::SliceRandom;
use rand::thread_rng;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::path::Path;
use tokio_postgres::types::ToSql;
use tracing::{info, debug, warn};

// Parsed taxi trip ready for insertion
struct ParsedTrip {
    vendor_id: Option<i32>,
    pickup_datetime: chrono::NaiveDateTime,
    dropoff_datetime: Option<chrono::NaiveDateTime>,
    passenger_count: Option<i32>,
    trip_distance: Option<f64>,
    pickup_location_id: Option<i32>,
    dropoff_location_id: Option<i32>,
    pickup_lng: f64,
    pickup_lat: f64,
    dropoff_lng: f64,
    dropoff_lat: f64,
    fare_amount: Option<f64>,
    total_amount: Option<f64>,
}

const BATCH_SIZE: usize = 1000;

pub async fn load(pool: &Pool, source: &str, limit: usize, random: bool) -> Result<()> {
    info!("Loading taxi data from: {} (random: {})", source, random);
    
    let source_path = Path::new(source);
    
    // Check if it's a URL or file
    let file_path = if source.starts_with("http") {
        let temp_path = std::env::temp_dir().join("taxi_data.parquet");
        crate::extractors::download_file(source, &temp_path).await?;
        temp_path
    } else {
        source_path.to_path_buf()
    };
    
    // If random mode and limit > 0, pre-compute which row indices to include
    let random_indices: Option<HashSet<usize>> = if random && limit > 0 {
        info!("Random sampling mode: selecting {} random records", limit);
        
        // First, count total rows in the file
        let count_file = File::open(&file_path)?;
        let count_builder = ParquetRecordBatchReaderBuilder::try_new(count_file)?;
        let metadata = count_builder.metadata();
        let total_rows: usize = metadata.row_groups().iter().map(|rg| rg.num_rows() as usize).sum();
        
        info!("Total rows in parquet file: {}", total_rows);
        
        if limit >= total_rows {
            // No need to sample, just load all
            None
        } else {
            // Generate random indices
            let mut all_indices: Vec<usize> = (0..total_rows).collect();
            all_indices.shuffle(&mut thread_rng());
            let selected: HashSet<usize> = all_indices.into_iter().take(limit).collect();
            info!("Selected {} random indices for sampling", selected.len());
            Some(selected)
        }
    } else {
        None
    };
    
    // Open parquet file
    let file = File::open(&file_path)?;
    let builder = ParquetRecordBatchReaderBuilder::try_new(file)?;
    
    debug!("Parquet schema: {:?}", builder.schema());
    
    let reader = builder.with_batch_size(10000).build()?;
    
    let mut client = pool.get().await?;
    
    // Pre-load taxi zones into memory for fast coordinate lookup
    info!("Loading taxi zone coordinates...");
    let zone_coords = load_zone_coordinates(&client).await?;
    let default_coords = zone_coords.get(&264).cloned().unwrap_or((-73.98, 40.75));
    info!("Loaded {} taxi zones", zone_coords.len());
    
    // Clear existing data
    client.execute("TRUNCATE TABLE taxi_trips", &[]).await?;
    
    // Prepare the insert statement once
    let stmt = client.prepare(
        r#"INSERT INTO taxi_trips (
            vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
            trip_distance, pickup_location_id, dropoff_location_id,
            pickup_point, dropoff_point, fare_amount, total_amount
        ) VALUES (
            $1, $2, $3, $4, 
            $5::double precision::numeric, 
            $6, $7,
            ST_SetSRID(ST_MakePoint($8, $9), 4326),
            ST_SetSRID(ST_MakePoint($10, $11), 4326),
            $12::double precision::numeric, 
            $13::double precision::numeric
        )"#
    ).await?;
    
    let pb = ProgressBar::new_spinner();
    pb.set_style(ProgressStyle::default_spinner()
        .template("{spinner:.green} [{elapsed_precise}] {msg}")?);
    
    let mut batch: Vec<ParsedTrip> = Vec::with_capacity(BATCH_SIZE);
    let mut total_records = 0usize;
    let mut inserted_records = 0usize;
    let mut global_row_index = 0usize;  // Track absolute row position across all batches
    
    for batch_result in reader {
        let arrow_batch = batch_result?;
        let num_rows = arrow_batch.num_rows();
        
        // Check limit for non-random mode
        if random_indices.is_none() && limit > 0 && inserted_records >= limit {
            break;
        }
        
        // Log column types for first batch
        if total_records == 0 {
            for field in arrow_batch.schema().fields() {
                debug!("Column '{}' has type: {:?}", field.name(), field.data_type());
            }
        }
        
        // Get columns
        let vendor_col = arrow_batch.column_by_name("VendorID")
            .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
        let pickup_col = arrow_batch.column_by_name("tpep_pickup_datetime")
            .and_then(|c| c.as_any().downcast_ref::<TimestampMicrosecondArray>());
        let dropoff_col = arrow_batch.column_by_name("tpep_dropoff_datetime")
            .and_then(|c| c.as_any().downcast_ref::<TimestampMicrosecondArray>());
        let passenger_col = arrow_batch.column_by_name("passenger_count")
            .and_then(|c| c.as_any().downcast_ref::<Int64Array>());
        let distance_col = arrow_batch.column_by_name("trip_distance")
            .and_then(|c| c.as_any().downcast_ref::<Float64Array>());
        let pu_location_col = arrow_batch.column_by_name("PULocationID")
            .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
        let do_location_col = arrow_batch.column_by_name("DOLocationID")
            .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
        let fare_col = arrow_batch.column_by_name("fare_amount")
            .and_then(|c| c.as_any().downcast_ref::<Float64Array>());
        let total_col = arrow_batch.column_by_name("total_amount")
            .and_then(|c| c.as_any().downcast_ref::<Float64Array>());
        
        if pickup_col.is_none() {
            warn!("Could not parse tpep_pickup_datetime column - check data type");
            global_row_index += num_rows;
            continue;
        }
        
        for i in 0..num_rows {
            let absolute_index = global_row_index + i;
            
            // For random mode: skip if this index wasn't selected
            if let Some(ref indices) = random_indices {
                if !indices.contains(&absolute_index) {
                    continue;
                }
            }
            
            // For non-random mode with limit: stop when limit reached
            if random_indices.is_none() && limit > 0 && inserted_records >= limit {
                break;
            }
            
            let pickup_ts = pickup_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            
            let pickup_datetime = match pickup_ts.and_then(|ts| {
                chrono::DateTime::from_timestamp_micros(ts).map(|dt| dt.naive_utc())
            }) {
                Some(dt) => dt,
                None => continue,
            };
            
            let dropoff_ts = dropoff_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let dropoff_datetime = dropoff_ts.and_then(|ts| {
                chrono::DateTime::from_timestamp_micros(ts).map(|dt| dt.naive_utc())
            });
            
            let pu_location = pu_location_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            let do_location = do_location_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None });
            
            // Look up coordinates from pre-loaded zone data
            let (pickup_lng, pickup_lat) = pu_location
                .and_then(|id| zone_coords.get(&id))
                .cloned()
                .unwrap_or(default_coords);
            let (dropoff_lng, dropoff_lat) = do_location
                .and_then(|id| zone_coords.get(&id))
                .cloned()
                .unwrap_or(default_coords);
            
            batch.push(ParsedTrip {
                vendor_id: vendor_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None }),
                pickup_datetime,
                dropoff_datetime,
                passenger_count: passenger_col.and_then(|c| if c.is_valid(i) { Some(c.value(i) as i32) } else { None }),
                trip_distance: distance_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None }),
                pickup_location_id: pu_location,
                dropoff_location_id: do_location,
                pickup_lng,
                pickup_lat,
                dropoff_lng,
                dropoff_lat,
                fare_amount: fare_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None }),
                total_amount: total_col.and_then(|c| if c.is_valid(i) { Some(c.value(i)) } else { None }),
            });
            
            // Flush batch when full
            if batch.len() >= BATCH_SIZE {
                let count = insert_batch(&mut client, &stmt, &batch).await?;
                inserted_records += count;
                batch.clear();
                pb.set_message(format!("Inserted {} taxi records", inserted_records));
            }
        }
        
        // Update global row index after processing this batch
        global_row_index += num_rows;
        total_records = global_row_index;
        
        // For random mode: check if we've collected enough
        if random_indices.is_some() && (inserted_records + batch.len()) >= limit {
            break;
        }
    }
    
    // Insert remaining records
    if !batch.is_empty() {
        let count = insert_batch(&mut client, &stmt, &batch).await?;
        inserted_records += count;
    }
    
    pb.finish_with_message(format!("Completed: inserted {} taxi records", inserted_records));
    
    // Record ETL metadata
    client.execute(
        "INSERT INTO etl_metadata (table_name, source_file, records_loaded, started_at, completed_at, status) 
         VALUES ($1, $2, $3, NOW(), NOW(), 'completed')",
        &[&"taxi_trips", &source, &(inserted_records as i64)]
    ).await?;
    
    info!("Taxi data loaded: {} records", inserted_records);
    Ok(())
}

/// Load taxi zone coordinates into a HashMap for fast lookup
async fn load_zone_coordinates(client: &deadpool_postgres::Client) -> Result<HashMap<i32, (f64, f64)>> {
    let rows = client.query(
        "SELECT location_id, ST_X(centroid) as lng, ST_Y(centroid) as lat FROM taxi_zones",
        &[]
    ).await?;
    
    let mut coords = HashMap::new();
    for row in rows {
        let location_id: i32 = row.get(0);
        let lng: f64 = row.get(1);
        let lat: f64 = row.get(2);
        coords.insert(location_id, (lng, lat));
    }
    
    Ok(coords)
}

/// Insert a batch of trips in a single transaction
async fn insert_batch(
    client: &mut deadpool_postgres::Client,
    stmt: &tokio_postgres::Statement,
    batch: &[ParsedTrip],
) -> Result<usize> {
    let tx = client.transaction().await?;
    let mut count = 0;
    
    for trip in batch {
        let params: [&(dyn ToSql + Sync); 13] = [
            &trip.vendor_id,
            &trip.pickup_datetime,
            &trip.dropoff_datetime,
            &trip.passenger_count,
            &trip.trip_distance,
            &trip.pickup_location_id,
            &trip.dropoff_location_id,
            &trip.pickup_lng,
            &trip.pickup_lat,
            &trip.dropoff_lng,
            &trip.dropoff_lat,
            &trip.fare_amount,
            &trip.total_amount,
        ];
        tx.execute(stmt, &params).await?;
        count += 1;
    }
    
    tx.commit().await?;
    Ok(count)
}
