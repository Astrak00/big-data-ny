//! Data extractors - download and extract data from URLs

use anyhow::Result;
use futures::StreamExt;
use indicatif::{ProgressBar, ProgressStyle};
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tracing::info;

use crate::config;

pub async fn download_all(output_dir: &str) -> Result<()> {
    let output_path = Path::new(output_dir);
    tokio::fs::create_dir_all(output_path).await?;
    
    info!("Downloading data to {}", output_dir);
    
    // Download taxi data
    info!("Downloading taxi data...");
    download_file(
        config::TAXI_DATA_URL,
        &output_path.join("yellow_tripdata_2024-12.parquet"),
    ).await?;
    
    // Download bike data (zip file)
    info!("Downloading bike data...");
    let bike_zip = output_path.join("citibike.csv.zip");
    download_file(config::BIKE_DATA_URL, &bike_zip).await?;
    extract_zip(&bike_zip, output_path).await?;
    
    // Download arrests data
    info!("Downloading arrests data...");
    download_file(
        config::ARRESTS_DATA_URL,
        &output_path.join("NYPD_Arrests_Data.geojson"),
    ).await?;
    
    // Download shootings data
    info!("Downloading shootings data...");
    download_file(
        config::SHOOTINGS_DATA_URL,
        &output_path.join("NYPD_Shooting_Incident_Data.geojson"),
    ).await?;
    
    // Download MTA data
    info!("Downloading MTA data...");
    download_file(
        config::MTA_DATA_URL,
        &output_path.join("MTA_Daily_Ridership_Data.csv"),
    ).await?;
    
    info!("All downloads completed!");
    Ok(())
}

pub async fn download_file(url: &str, output_path: &Path) -> Result<()> {
    let client = reqwest::Client::new();
    let response = client.get(url).send().await?;
    
    let total_size = response.content_length().unwrap_or(0);
    
    let pb = ProgressBar::new(total_size);
    pb.set_style(ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})")?
        .progress_chars("#>-"));
    
    let mut file = File::create(output_path).await?;
    let mut stream = response.bytes_stream();
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await?;
        pb.inc(chunk.len() as u64);
    }
    
    pb.finish_with_message("Download complete");
    Ok(())
}

async fn extract_zip(zip_path: &Path, output_dir: &Path) -> Result<()> {
    use zip::ZipArchive;
    
    let zip_data = tokio::fs::read(zip_path).await?;
    let cursor = std::io::Cursor::new(zip_data);
    let mut archive = ZipArchive::new(cursor)?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = output_dir.join(file.name());
        
        if file.name().ends_with('/') {
            tokio::fs::create_dir_all(&outpath).await?;
        } else {
            if let Some(parent) = outpath.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }
    
    // Clean up zip file
    tokio::fs::remove_file(zip_path).await?;
    
    Ok(())
}
