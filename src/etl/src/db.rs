//! Database configuration and connection pool

use anyhow::Result;
use deadpool_postgres::{Config, Pool, Runtime};
use tokio_postgres::NoTls;
use tracing::info;

pub async fn create_pool(database_url: &str) -> Result<Pool> {
    // Parse the URL into config
    let config = database_url.parse::<tokio_postgres::Config>()?;
    
    let mut pool_config = Config::new();
    
    // Extract components from the parsed config
    if let Some(host) = config.get_hosts().first() {
        match host {
            tokio_postgres::config::Host::Tcp(h) => pool_config.host = Some(h.clone()),
            _ => {}
        }
    }
    
    if let Some(port) = config.get_ports().first() {
        pool_config.port = Some(*port);
    }
    
    if let Some(user) = config.get_user() {
        pool_config.user = Some(user.to_string());
    }
    
    if let Some(password) = config.get_password() {
        pool_config.password = Some(String::from_utf8_lossy(password).to_string());
    }
    
    if let Some(dbname) = config.get_dbname() {
        pool_config.dbname = Some(dbname.to_string());
    }
    
    let pool = pool_config.create_pool(Some(Runtime::Tokio1), NoTls)?;
    
    // Test the connection
    let client = pool.get().await?;
    client.query_one("SELECT 1", &[]).await?;
    
    info!("Database connection pool created successfully");
    
    Ok(pool)
}

pub async fn count_records(pool: &Pool, table: Option<&str>) -> Result<()> {
    let client = pool.get().await?;
    
    if let Some(table_name) = table {
        let row = client
            .query_one(&format!("SELECT COUNT(*) FROM {}", table_name), &[])
            .await?;
        let count: i64 = row.get(0);
        info!("Table '{}' has {} records", table_name, count);
    } else {
        // Obtain all table names from the public schema
        let rows = client
            .query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
                &[],
            )
            .await?;
        let tables: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
        
        for table_name in tables {
            let row = client
                .query_one(&format!("SELECT COUNT(*) FROM {}", table_name), &[])
                .await?;
            let count: i64 = row.get(0);
            info!("Table '{}' has {} records", table_name, count);
        }
    }
    
    Ok(())
}