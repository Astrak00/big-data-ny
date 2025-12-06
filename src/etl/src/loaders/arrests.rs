//! Arrests data loader - reads from GeoJSON files

use anyhow::Result;
use deadpool_postgres::Pool;
use indicatif::{ProgressBar, ProgressStyle};
use serde::Deserialize;
use std::fs;
use std::path::Path;
use tracing::info;

#[derive(Debug, Deserialize)]
struct GeoJsonFeatureCollection {
    features: Vec<GeoJsonFeature>,
}

#[derive(Debug, Deserialize)]
struct GeoJsonFeature {
    geometry: Option<Geometry>,
    properties: ArrestProperties,
}

#[derive(Debug, Deserialize)]
struct Geometry {
    coordinates: Option<Vec<f64>>,
}

#[derive(Debug, Deserialize)]
struct ArrestProperties {
    arrest_date: Option<String>,
    arrest_boro: Option<String>,
    arrest_precinct: Option<String>,
    ofns_desc: Option<String>,
    pd_desc: Option<String>,
    perp_sex: Option<String>,
    perp_race: Option<String>,
    age_group: Option<String>,
}

pub async fn load(pool: &Pool, source: &str, limit: usize) -> Result<()> {
    info!("Loading arrests data from: {}", source);
    
    let source_path = Path::new(source);
    
    // Check if it's a URL or file
    let content = if source.starts_with("http") {
        let client = reqwest::Client::new();
        client.get(source).send().await?.text().await?
    } else {
        fs::read_to_string(source_path)?
    };
    
    let geojson: GeoJsonFeatureCollection = serde_json::from_str(&content)?;
    
    let client = pool.get().await?;
    
    // Clear existing data
    client.execute("TRUNCATE TABLE arrests", &[]).await?;
    
    let total = if limit > 0 { 
        std::cmp::min(limit, geojson.features.len()) 
    } else { 
        geojson.features.len() 
    };
    
    let pb = ProgressBar::new(total as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")?
        .progress_chars("#>-"));
    
    let mut loaded = 0usize;
    
    for feature in geojson.features.iter().take(total) {
        let coords = feature.geometry.as_ref()
            .and_then(|g| g.coordinates.as_ref())
            .filter(|c| c.len() >= 2);
        
        // Parse arrest date
        let arrest_date = feature.properties.arrest_date.as_ref().and_then(|s| {
            // Try multiple date formats
            chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                .or_else(|_| chrono::NaiveDate::parse_from_str(s, "%m/%d/%Y"))
                .ok()
                .or_else(|| {
                    // Handle datetime format
                    s.split('T').next()
                        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
                })
        });
        
        let precinct = feature.properties.arrest_precinct.as_ref()
            .and_then(|s| s.parse::<i32>().ok());
        
        let boro = feature.properties.arrest_boro.as_ref()
            .and_then(|s| s.chars().next())
            .map(|c| c.to_string());
        
        let sex = feature.properties.perp_sex.as_ref()
            .and_then(|s| s.chars().next())
            .map(|c| c.to_string());
        
        if let (Some(date), Some(coords)) = (arrest_date, coords) {
            client.execute(
                r#"
                INSERT INTO arrests (
                    arrest_date, arrest_boro, arrest_precinct,
                    offense_description, pd_description,
                    perp_sex, perp_race, age_group, location
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    ST_SetSRID(ST_MakePoint($9, $10), 4326)
                )
                "#,
                &[
                    &date, &boro, &precinct,
                    &feature.properties.ofns_desc, &feature.properties.pd_desc,
                    &sex, &feature.properties.perp_race, &feature.properties.age_group,
                    &coords[0], &coords[1]
                ]
            ).await?;
            
            loaded += 1;
        }
        
        pb.inc(1);
    }
    
    pb.finish_with_message(format!("Completed loading {} arrest records", loaded));
    
    // Record ETL metadata
    client.execute(
        "INSERT INTO etl_metadata (table_name, source_file, records_loaded, started_at, completed_at, status) 
         VALUES ($1, $2, $3, NOW(), NOW(), 'completed')",
        &[&"arrests", &source, &(loaded as i64)]
    ).await?;
    
    info!("Arrests data loaded: {} records", loaded);
    Ok(())
}
