//! Bike trip data loader - reads from CSV files

use anyhow::Result;
use deadpool_postgres::Pool;
use indicatif::{ProgressBar, ProgressStyle};
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use tracing::info;

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

pub async fn load(pool: &Pool, source: &str, limit: usize) -> Result<()> {
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
    
    let client = pool.get().await?;
    
    // Clear existing data
    client.execute("TRUNCATE TABLE bike_trips", &[]).await?;
    
    let mut total_records = 0usize;
    let pb = ProgressBar::new_spinner();
    pb.set_style(ProgressStyle::default_spinner()
        .template("{spinner:.green} [{elapsed_precise}] {msg}")?);
    
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
        
        // Parse timestamps
        let started_at = trip.started_at.as_ref().and_then(|s| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .or_else(|_| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
                .ok()
        });
        
        let ended_at = trip.ended_at.as_ref().and_then(|s| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .or_else(|_| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
                .ok()
        });
        
        if let Some(start_time) = started_at {
            // Skip rows with invalid coordinates
            if trip.start_lat.is_none() || trip.start_lng.is_none() {
                continue;
            }
            
            client.execute(
                r#"
                INSERT INTO bike_trips (
                    ride_id, rideable_type, started_at, ended_at,
                    start_station_name, start_station_id,
                    end_station_name, end_station_id,
                    start_point, end_point, member_casual
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    ST_SetSRID(ST_MakePoint($9, $10), 4326),
                    CASE WHEN $11 IS NOT NULL AND $12 IS NOT NULL 
                         THEN ST_SetSRID(ST_MakePoint($11, $12), 4326)
                         ELSE NULL END,
                    $13
                )
                "#,
                &[
                    &trip.ride_id, &trip.rideable_type, &start_time, &ended_at,
                    &trip.start_station_name, &trip.start_station_id,
                    &trip.end_station_name, &trip.end_station_id,
                    &trip.start_lng, &trip.start_lat,
                    &trip.end_lng, &trip.end_lat,
                    &trip.member_casual
                ]
            ).await?;
            
            total_records += 1;
            
            if total_records % 1000 == 0 {
                pb.set_message(format!("Loaded {} bike records", total_records));
            }
        }
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
