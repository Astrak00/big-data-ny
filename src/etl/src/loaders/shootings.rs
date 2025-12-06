//! Shootings data loader - reads from GeoJSON files

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
    properties: ShootingProperties,
}

#[derive(Debug, Deserialize)]
struct Geometry {
    coordinates: Option<Vec<f64>>,
}

#[derive(Debug, Deserialize)]
struct ShootingProperties {
    occur_date: Option<String>,
    occur_time: Option<String>,
    boro: Option<String>,
    precinct: Option<String>,
    loc_of_occur_desc: Option<String>,
    loc_classfctn_desc: Option<String>,
    statistical_murder_flag: Option<String>,
    perp_sex: Option<String>,
    perp_age_group: Option<String>,
    perp_race: Option<String>,
    vic_sex: Option<String>,
    vic_age_group: Option<String>,
    vic_race: Option<String>,
}

pub async fn load(pool: &Pool, source: &str, limit: usize) -> Result<()> {
    info!("Loading shootings data from: {}", source);
    
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
    client.execute("TRUNCATE TABLE shootings", &[]).await?;
    
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
        
        // Parse occur date
        let occur_date = feature.properties.occur_date.as_ref().and_then(|s| {
            chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                .or_else(|_| chrono::NaiveDate::parse_from_str(s, "%m/%d/%Y"))
                .ok()
                .or_else(|| {
                    s.split('T').next()
                        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
                })
        });
        
        // Parse occur time
        let occur_time = feature.properties.occur_time.as_ref().and_then(|s| {
            chrono::NaiveTime::parse_from_str(s, "%H:%M:%S")
                .or_else(|_| chrono::NaiveTime::parse_from_str(s, "%H:%M"))
                .ok()
        });
        
        let precinct = feature.properties.precinct.as_ref()
            .and_then(|s| s.parse::<i32>().ok());
        
        let murder_flag = feature.properties.statistical_murder_flag.as_ref()
            .map(|s| s.to_lowercase() == "true" || s == "Y" || s == "1");
        
        let perp_sex = feature.properties.perp_sex.as_ref()
            .and_then(|s| s.chars().next())
            .map(|c| c.to_string());
        
        let vic_sex = feature.properties.vic_sex.as_ref()
            .and_then(|s| s.chars().next())
            .map(|c| c.to_string());
        
        if let (Some(date), Some(coords)) = (occur_date, coords) {
            client.execute(
                r#"
                INSERT INTO shootings (
                    occur_date, occur_time, boro, precinct,
                    location_desc, location_class, statistical_murder_flag,
                    perp_sex, perp_age_group, perp_race,
                    vic_sex, vic_age_group, vic_race, location
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                    ST_SetSRID(ST_MakePoint($14, $15), 4326)
                )
                "#,
                &[
                    &date, &occur_time, &feature.properties.boro, &precinct,
                    &feature.properties.loc_of_occur_desc, &feature.properties.loc_classfctn_desc,
                    &murder_flag,
                    &perp_sex, &feature.properties.perp_age_group, &feature.properties.perp_race,
                    &vic_sex, &feature.properties.vic_age_group, &feature.properties.vic_race,
                    &coords[0], &coords[1]
                ]
            ).await?;
            
            loaded += 1;
        }
        
        pb.inc(1);
    }
    
    pb.finish_with_message(format!("Completed loading {} shooting records", loaded));
    
    // Record ETL metadata
    client.execute(
        "INSERT INTO etl_metadata (table_name, source_file, records_loaded, started_at, completed_at, status) 
         VALUES ($1, $2, $3, NOW(), NOW(), 'completed')",
        &[&"shootings", &source, &(loaded as i64)]
    ).await?;
    
    info!("Shootings data loaded: {} records", loaded);
    Ok(())
}
