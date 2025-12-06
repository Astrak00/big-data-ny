//! MTA ridership data loader - reads from CSV files

use anyhow::Result;
use deadpool_postgres::Pool;
use indicatif::{ProgressBar, ProgressStyle};
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use tracing::info;

#[derive(Debug, Deserialize)]
struct MTARidership {
    #[serde(rename = "Date")]
    date: Option<String>,
    #[serde(rename = "Subways: Total Estimated Ridership")]
    subways_ridership: Option<String>,
    #[serde(rename = "Subways: % of Comparable Pre-Pandemic Day")]
    subways_percent: Option<String>,
    #[serde(rename = "Buses: Total Estimated Ridership")]
    buses_ridership: Option<String>,
    #[serde(rename = "Buses: % of Comparable Pre-Pandemic Day")]
    buses_percent: Option<String>,
    #[serde(rename = "LIRR: Total Estimated Ridership")]
    lirr_ridership: Option<String>,
    #[serde(rename = "Metro-North: Total Estimated Ridership")]
    metro_north_ridership: Option<String>,
    #[serde(rename = "Access-A-Ride: Total Scheduled Trips")]
    access_a_ride_trips: Option<String>,
    #[serde(rename = "Bridges and Tunnels: Total Traffic")]
    bridges_tunnels_traffic: Option<String>,
    #[serde(rename = "Staten Island Railway: Total Estimated Ridership")]
    staten_island_railway: Option<String>,
}

fn parse_number(s: Option<&String>) -> Option<i64> {
    s.and_then(|v| {
        v.replace(",", "")
            .replace("%", "")
            .trim()
            .parse::<i64>()
            .ok()
    })
}

pub async fn load(pool: &Pool, source: &str, limit: usize) -> Result<()> {
    info!("Loading MTA data from: {}", source);
    
    let source_path = Path::new(source);
    
    // Check if it's a URL or file
    let file_path = if source.starts_with("http") {
        let temp_path = std::env::temp_dir().join("mta_data.csv");
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
    client.execute("TRUNCATE TABLE mta_ridership", &[]).await?;
    
    let mut total_records = 0usize;
    let pb = ProgressBar::new_spinner();
    pb.set_style(ProgressStyle::default_spinner()
        .template("{spinner:.green} [{elapsed_precise}] {msg}")?);
    
    for result in csv_reader.deserialize() {
        if limit > 0 && total_records >= limit {
            break;
        }
        
        let record: MTARidership = match result {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!("Skipping invalid row: {}", e);
                continue;
            }
        };
        
        // Parse date (format: MM/DD/YYYY)
        let date = record.date.as_ref().and_then(|s| {
            chrono::NaiveDate::parse_from_str(s, "%m/%d/%Y")
                .or_else(|_| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d"))
                .ok()
        });
        
        if let Some(date) = date {
            let subways = parse_number(record.subways_ridership.as_ref());
            let subways_pct = parse_number(record.subways_percent.as_ref()).map(|v| v as i32);
            let buses = parse_number(record.buses_ridership.as_ref());
            let buses_pct = parse_number(record.buses_percent.as_ref()).map(|v| v as i32);
            let lirr = parse_number(record.lirr_ridership.as_ref());
            let metro_north = parse_number(record.metro_north_ridership.as_ref());
            let access = parse_number(record.access_a_ride_trips.as_ref());
            let bridges = parse_number(record.bridges_tunnels_traffic.as_ref());
            let sir = parse_number(record.staten_island_railway.as_ref());
            
            client.execute(
                r#"
                INSERT INTO mta_ridership (
                    date, subways_ridership, subways_percent,
                    buses_ridership, buses_percent,
                    lirr_ridership, metro_north_ridership,
                    access_a_ride_trips, bridges_tunnels_traffic,
                    staten_island_railway
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (date) DO UPDATE SET
                    subways_ridership = EXCLUDED.subways_ridership,
                    subways_percent = EXCLUDED.subways_percent,
                    buses_ridership = EXCLUDED.buses_ridership,
                    buses_percent = EXCLUDED.buses_percent,
                    lirr_ridership = EXCLUDED.lirr_ridership,
                    metro_north_ridership = EXCLUDED.metro_north_ridership,
                    access_a_ride_trips = EXCLUDED.access_a_ride_trips,
                    bridges_tunnels_traffic = EXCLUDED.bridges_tunnels_traffic,
                    staten_island_railway = EXCLUDED.staten_island_railway
                "#,
                &[
                    &date, &subways, &subways_pct,
                    &buses, &buses_pct,
                    &lirr, &metro_north,
                    &access, &bridges, &sir
                ]
            ).await?;
            
            total_records += 1;
            
            if total_records % 100 == 0 {
                pb.set_message(format!("Loaded {} MTA records", total_records));
            }
        }
    }
    
    pb.finish_with_message(format!("Completed loading {} MTA records", total_records));
    
    // Record ETL metadata
    client.execute(
        "INSERT INTO etl_metadata (table_name, source_file, records_loaded, started_at, completed_at, status) 
         VALUES ($1, $2, $3, NOW(), NOW(), 'completed')",
        &[&"mta_ridership", &source, &(total_records as i64)]
    ).await?;
    
    info!("MTA data loaded: {} records", total_records);
    Ok(())
}
