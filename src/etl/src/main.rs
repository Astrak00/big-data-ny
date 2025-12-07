//! NYC Urban Data ETL Pipeline
//! ============================
//! 
//! Extracts, transforms, and loads NYC urban data into PostgreSQL.
//! Supports: Taxi trips, Bike trips, Arrests, Shootings, MTA ridership

mod config;
mod db;
mod extractors;
mod loaders;
mod transformers;

use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[derive(Parser)]
#[command(name = "nyc-etl")]
#[command(about = "ETL pipeline for NYC Urban Data", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// Database connection URL
    #[arg(long, env = "DATABASE_URL", default_value = "postgres://nyc_user:nyc_password@localhost:5432/nyc_urban_data")]
    database_url: String,
}

#[derive(Subcommand)]
enum Commands {
    /// Run all ETL pipelines
    All {
        /// Data directory path
        #[arg(short, long, default_value = "./data_trunc")]
        data_dir: String,
    },
    /// Load taxi trip data from parquet
    Taxi {
        /// Path to parquet file or URL
        #[arg(short, long)]
        source: String,
        /// Maximum records to load (0 = all)
        #[arg(short, long, default_value = "0")]
        limit: usize,
        /// Randomly sample records instead of loading sequentially
        #[arg(short, long, default_value = "false")]
        random: bool,
    },
    /// Load bike trip data from CSV
    Bike {
        /// Path to CSV file or URL
        #[arg(short, long)]
        source: String,
        #[arg(short, long, default_value = "0")]
        limit: usize,
        #[arg(short, long, default_value = "false")]
        truncate: bool,
    },
    /// Load arrests data from GeoJSON
    Arrests {
        /// Path to GeoJSON file or URL
        #[arg(short, long)]
        source: String,
        #[arg(short, long, default_value = "0")]
        limit: usize,
    },
    /// Load shootings data from GeoJSON
    Shootings {
        /// Path to GeoJSON file or URL
        #[arg(short, long)]
        source: String,
        #[arg(short, long, default_value = "0")]
        limit: usize,
    },
    /// Load MTA ridership data from CSV
    Mta {
        /// Path to CSV file or URL
        #[arg(short, long)]
        source: String,
        #[arg(short, long, default_value = "0")]
        limit: usize,
    },
    /// Download data from URLs
    Download {
        /// Output directory
        #[arg(short, long, default_value = "./data")]
        output_dir: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(false)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let cli = Cli::parse();
    
    info!("NYC Urban Data ETL Pipeline starting...");
    
    // Create database connection pool
    let pool = db::create_pool(&cli.database_url).await?;
    
    match cli.command {
        Commands::All { data_dir } => {
            run_all_pipelines(&pool, &data_dir).await?;
        }
        Commands::Taxi { source, limit, random } => {
            loaders::taxi::load(&pool, &source, limit, random).await?;
        }
        Commands::Bike { source, limit, truncate } => {
            loaders::bike::load(&pool, &source, limit, truncate).await?;
        }
        Commands::Arrests { source, limit } => {
            loaders::arrests::load(&pool, &source, limit).await?;
        }
        Commands::Shootings { source, limit } => {
            loaders::shootings::load(&pool, &source, limit).await?;
        }
        Commands::Mta { source, limit } => {
            loaders::mta::load(&pool, &source, limit).await?;
        }
        Commands::Download { output_dir } => {
            extractors::download_all(&output_dir).await?;
        }
    }
    
    info!("ETL Pipeline completed successfully!");
    Ok(())
}

async fn run_all_pipelines(pool: &deadpool_postgres::Pool, data_dir: &str) -> Result<()> {
    use std::path::Path;
    
    let data_path = Path::new(data_dir);
    
    // Load taxi data
    let taxi_file = data_path.join("yellow_tripdata_2024-12.parquet");
    if taxi_file.exists() {
        info!("Loading taxi data...");
        loaders::taxi::load(pool, taxi_file.to_str().unwrap(), 0, false).await?;
    }
    
    // Load bike data
    let bike_file = data_path.join("JC-202412-citibike-tripdata.csv");
    if bike_file.exists() {
        info!("Loading bike data...");
        loaders::bike::load(pool, bike_file.to_str().unwrap(), 0, false).await?;
    }
    
    // Load arrests data
    let arrests_file = data_path.join("NYPD_Arrests_Data_1000.geojson");
    if arrests_file.exists() {
        info!("Loading arrests data...");
        loaders::arrests::load(pool, arrests_file.to_str().unwrap(), 0).await?;
    }
    
    // Load shootings data
    let shootings_file = data_path.join("NYPD_Shooting_Incident_Data_1000.geojson");
    if shootings_file.exists() {
        info!("Loading shootings data...");
        loaders::shootings::load(pool, shootings_file.to_str().unwrap(), 0).await?;
    }
    
    // Load MTA data
    let mta_file = data_path.join("MTA_Daily_Ridership_Data__2020_-_2025_20251206.csv");
    if mta_file.exists() {
        info!("Loading MTA data...");
        loaders::mta::load(pool, mta_file.to_str().unwrap(), 0).await?;
    }
    
    Ok(())
}
