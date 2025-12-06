use clap::Parser;
use futures::stream::{self, StreamExt};
use reqwest::Client;
use std::path::Path;
use std::sync::Arc;
use tokio::{fs, fs::File, io::AsyncWriteExt, time::{sleep, Duration}};

// NOTE: Unzip/uncompress functionality removed — downloads are kept as-is.

#[derive(Parser)]
struct Args {
    /// Max concurrent downloads (defaults to num_cpus * 8)
    #[arg(short, long)]
    concurrency: Option<usize>,

    /// Start year (inclusive)
    #[arg(long, default_value_t = 2015u16)]
    start_year: u16,

    /// End year (inclusive)
    #[arg(long, default_value_t = 2025u16)]
    end_year: u16,
}

fn make_url(year: u16, month: u8) -> (String, String) {
    let month_str = format!("{:02}", month);
    let filename = format!("taxi_data/yellow_tripdata_{}-{}.parquet", year, month_str);
    let url = format!("https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_{}-{}.parquet", year, month_str);
    (url, filename)
}

async fn download_with_retries(client: Arc<Client>, url: &str, path: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let max_attempts = 5u32;
    for attempt in 1..=max_attempts {
        match client.get(url).send().await {
            Ok(resp) => {
                let resp = resp.error_for_status();
                match resp {
                    Ok(r) => {
                        let r = r;
                        // Stream to a temporary file and then rename
                        let tmp_path = format!("{}.part", path);
                        let mut file = File::create(&tmp_path).await?;
                        let mut stream = r.bytes_stream();
                        while let Some(chunk) = stream.next().await {
                            let bytes = chunk?;
                            file.write_all(&bytes).await?;
                        }
                        file.flush().await?;
                        fs::rename(&tmp_path, path).await?;
                        println!("Downloaded {} -> {}", url, path);
                        return Ok(());
                    }
                    Err(e) => {
                        eprintln!("Request failed (status) for {}: {}", url, e);
                    }
                }
            }
            Err(e) => {
                eprintln!("Request error for {}: {}", url, e);
            }
        }

        if attempt < max_attempts {
            let backoff = Duration::from_secs(2u64.pow(attempt.min(6)));
            println!("Retrying {} (attempt {}/{}) after {:?}", url, attempt + 1, max_attempts, backoff);
            sleep(backoff).await;
        }
    }

    Err(format!("Failed to download {} after {} attempts", url, max_attempts).into())
}

#[tokio::main(flavor = "multi_thread")]
async fn main() {
    let args = Args::parse();
    let default_concurrency = num_cpus::get() * 8;
    let concurrency = args.concurrency.unwrap_or(default_concurrency);

    println!("Using concurrency = {}", concurrency);

    // Ensure output directory exists
    if let Err(e) = fs::create_dir_all("taxi_data").await {
        eprintln!("Failed to create taxi_data directory: {}", e);
        return;
    }

    let mut urls = Vec::new();
    for year in args.start_year..=args.end_year {
        for month in 1u8..=12u8 {
            let (url, filename) = make_url(year, month);
            urls.push((url, filename));
        }
    }

    let client = Arc::new(Client::builder()
        .user_agent("download_taxi_rust/0.1")
        .build()
        .expect("client build"));

    let total = urls.len();
    println!("Starting downloads for {} targets", total);

    let failures = stream::iter(urls)
        .map(|(url, filename)| {
            let client = client.clone();
            async move {
                if Path::new(&filename).exists() {
                    println!("Skipping existing {}", filename);
                    return Ok::<(), Box<dyn std::error::Error + Send + Sync>>(());
                }

                match download_with_retries(client, &url, &filename).await {
                    Ok(_) => {
                        // No uncompression: downloaded file is kept as-is.
                        Ok(())
                    }
                    Err(e) => {
                        eprintln!("Failed {} -> {}: {}", url, filename, e);
                        Err(e)
                    }
                }
            }
        })
        .buffer_unordered(concurrency)
        .fold(0usize, |fail_count, res| async move {
            match res {
                Ok(_) => fail_count,
                Err(_) => fail_count + 1,
            }
        })
        .await;

    let success = total.saturating_sub(failures);
    println!("Finished. Success: {}, Failures: {}", success, failures);
}
