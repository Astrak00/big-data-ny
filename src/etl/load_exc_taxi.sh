cargo run --release -- bike --source ../../data_trunc/202412-citibike-tripdata_1.csv
cargo run --release -- bike --source ../../data_trunc/202412-citibike-tripdata_2.csv
cargo run --release -- bike --source ../../data_trunc/202412-citibike-tripdata_3.csv
cargo run --release -- arrests --source ../../data_trunc/NYPD_Arrests_Data_1000.geojson
cargo run --release -- shootings --source ../../data_trunc/NYPD_Shooting_Incident_Data_1000.geojson
cargo run --release -- mta --source ../../data_trunc/MTA_Daily_Ridership_Data__2020_-_2025_20251206.csv
cargo run --release -- taxi --source ../../data_trunc/yellow_tripdata_2024-12.parquet --limit 50000 --random

