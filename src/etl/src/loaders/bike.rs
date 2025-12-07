//! Bike trip data loader - reads from CSV files with batch insert optimization

use anyhow::Result;
use deadpool_postgres::Pool;
use indicatif::{ProgressBar, ProgressStyle};
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use tracing::info;
use tokio_postgres::types::ToSql;

#[derive(Debug, Deserialize)]
struct BikeTrip {
    ride_id: Option<String>,
    rideable_type: Option<String>,
    started_at: Option<String>,
    ended_at: Option<String>,
    start_station_name: Option<String>,
    start_station_id: Option<String>,
    end_station_name: Option<String>,
    end_station_id: Option<String>,
    start_lat: Option<f64>,
    start_lng: Option<f64>,
    end_lat: Option<f64>,
    end_lng: Option<f64>,
    member_casual: Option<String>,
}

// Parsed bike trip ready for insertion
struct ParsedTrip {
    ride_id: Option<String>,
    rideable_type: Option<String>,
    started_at: chrono::NaiveDateTime,
    ended_at: Option<chrono::NaiveDateTime>,
    start_station_name: Option<String>,
    start_station_id: Option<String>,
    end_station_name: Option<String>,
    end_station_id: Option<String>,
    start_lng: f64,
    start_lat: f64,
    end_lng: Option<f64>,
    end_lat: Option<f64>,
    member_casual: Option<String>,
}

const BATCH_SIZE: usize = 1000;

pub async fn load(pool: &Pool, source: &str, limit: usize, truncate: bool) -> Result<()> {
    info!("Loading bike data from: {}", source);
    
    let source_path = Path::new(source);
    
    // Check if it's a URL or file
    let file_path = if source.starts_with("http") {
        let temp_path = std::env::temp_dir().join("bike_data.csv");
        crate::extractors::download_file(source, &temp_path).await?;
        temp_path
    } else {
        source_path.to_path_buf()
    };
    
    let file = File::open(&file_path)?;
    let reader = BufReader::new(file);
    let mut csv_reader = csv::Reader::from_reader(reader);
    
    let mut client = pool.get().await?;
    
    // Clear existing data
    if truncate {
        info!("Truncating existing bike_trips data...");
        client.execute("TRUNCATE TABLE bike_trips", &[]).await?;
    }
    
    let pb = ProgressBar::new_spinner();
    pb.set_style(ProgressStyle::default_spinner()
        .template("{spinner:.green} [{elapsed_precise}] {msg}")?);
    
    // Prepare both statements once
    let stmt_with_end = client.prepare(
        r#"INSERT INTO bike_trips (
            ride_id, rideable_type, started_at, ended_at,
            start_station_name, start_station_id,
            end_station_name, end_station_id,
            start_point, end_point, member_casual
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            ST_SetSRID(ST_MakePoint($9, $10), 4326),
            ST_SetSRID(ST_MakePoint($11, $12), 4326),
            $13
        )"#
    ).await?;
    
    let stmt_without_end = client.prepare(
        r#"INSERT INTO bike_trips (
            ride_id, rideable_type, started_at, ended_at,
            start_station_name, start_station_id,
            end_station_name, end_station_id,
            start_point, end_point, member_casual
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            ST_SetSRID(ST_MakePoint($9, $10), 4326),
            NULL,
            $11
        )"#
    ).await?;
    
    let mut batch: Vec<ParsedTrip> = Vec::with_capacity(BATCH_SIZE);
    let mut total_records = 0usize;
    
    for result in csv_reader.deserialize() {
        if limit > 0 && total_records >= limit {
            break;
        }
        
        let trip: BikeTrip = match result {
            Ok(t) => t,
            Err(e) => {
                tracing::warn!("Skipping invalid row: {}", e);
                continue;
            }
        };
        
        // Parse timestamps (format: 2024-12-06 17:50:49.428)
        let started_at = match trip.started_at.as_ref().and_then(|s| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
                .or_else(|_| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
                .or_else(|_| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
                .ok()
        }) {
            Some(dt) => dt,
            None => continue,
        };
        
        let ended_at = trip.ended_at.as_ref().and_then(|s| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
                .or_else(|_| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
                .or_else(|_| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
                .ok()
        });
        
        // Skip rows with invalid coordinates
        let (start_lng, start_lat) = match (trip.start_lng, trip.start_lat) {
            (Some(lng), Some(lat)) => (lng, lat),
            _ => continue,
        };
        
        batch.push(ParsedTrip {
            ride_id: trip.ride_id,
            rideable_type: trip.rideable_type,
            started_at,
            ended_at,
            start_station_name: trip.start_station_name,
            start_station_id: trip.start_station_id,
            end_station_name: trip.end_station_name,
            end_station_id: trip.end_station_id,
            start_lng,
            start_lat,
            end_lng: trip.end_lng,
            end_lat: trip.end_lat,
            member_casual: trip.member_casual,
        });
        
        total_records += 1;
        
        // Flush batch when full
        if batch.len() >= BATCH_SIZE {
            insert_batch(&mut client, &stmt_with_end, &stmt_without_end, &batch).await?;
            batch.clear();
            pb.set_message(format!("Loaded {} bike records", total_records));
        }
    }
    
    // Insert remaining records
    if !batch.is_empty() {
        insert_batch(&mut client, &stmt_with_end, &stmt_without_end, &batch).await?;
    }
    
    pb.finish_with_message(format!("Completed loading {} bike records", total_records));
    
    // Record ETL metadata
    client.execute(
        "INSERT INTO etl_metadata (table_name, source_file, records_loaded, started_at, completed_at, status) 
         VALUES ($1, $2, $3, NOW(), NOW(), 'completed')",
        &[&"bike_trips", &source, &(total_records as i64)]
    ).await?;
    
    info!("Bike data loaded: {} records", total_records);
    Ok(())
}

async fn insert_batch(
    client: &mut deadpool_postgres::Client,
    stmt_with_end: &tokio_postgres::Statement,
    stmt_without_end: &tokio_postgres::Statement,
    batch: &[ParsedTrip],
) -> Result<()> {
    // Use a transaction for the batch
    let tx = client.transaction().await?;
    
    for trip in batch {
        let has_end_point = trip.end_lng.is_some() && trip.end_lat.is_some();
        
        if has_end_point {
            let end_lng = trip.end_lng.unwrap();
            let end_lat = trip.end_lat.unwrap();
            let params: [&(dyn ToSql + Sync); 13] = [
                &trip.ride_id, &trip.rideable_type, &trip.started_at, &trip.ended_at,
                &trip.start_station_name, &trip.start_station_id,
                &trip.end_station_name, &trip.end_station_id,
                &trip.start_lng, &trip.start_lat,
                &end_lng, &end_lat,
                &trip.member_casual
            ];
            tx.execute(stmt_with_end, &params).await?;
        } else {
            let params: [&(dyn ToSql + Sync); 11] = [
                &trip.ride_id, &trip.rideable_type, &trip.started_at, &trip.ended_at,
                &trip.start_station_name, &trip.start_station_id,
                &trip.end_station_name, &trip.end_station_id,
                &trip.start_lng, &trip.start_lat,
                &trip.member_casual
            ];
            tx.execute(stmt_without_end, &params).await?;
        }
    }
    
    tx.commit().await?;
    Ok(())
}
