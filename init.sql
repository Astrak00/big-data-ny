-- NYC Urban Data Explorer - Database Schema
-- ==========================================

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===========================================
-- Taxi Trips Table
-- ===========================================
CREATE TABLE IF NOT EXISTS taxi_trips (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER,
    pickup_datetime TIMESTAMP NOT NULL,
    dropoff_datetime TIMESTAMP,
    passenger_count INTEGER,
    trip_distance DECIMAL(10, 2),
    pickup_location_id INTEGER,
    dropoff_location_id INTEGER,
    pickup_point GEOMETRY(Point, 4326),
    dropoff_point GEOMETRY(Point, 4326),
    fare_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_taxi_pickup_datetime ON taxi_trips(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_taxi_pickup_point ON taxi_trips USING GIST(pickup_point);

-- ===========================================
-- Bike Trips Table
-- ===========================================
CREATE TABLE IF NOT EXISTS bike_trips (
    id SERIAL PRIMARY KEY,
    ride_id VARCHAR(50),
    rideable_type VARCHAR(50),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    start_station_name VARCHAR(255),
    start_station_id VARCHAR(50),
    end_station_name VARCHAR(255),
    end_station_id VARCHAR(50),
    start_point GEOMETRY(Point, 4326),
    end_point GEOMETRY(Point, 4326),
    member_casual VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bike_started_at ON bike_trips(started_at);
CREATE INDEX IF NOT EXISTS idx_bike_start_point ON bike_trips USING GIST(start_point);

-- ===========================================
-- Arrests Table
-- ===========================================
CREATE TABLE IF NOT EXISTS arrests (
    id SERIAL PRIMARY KEY,
    arrest_date DATE NOT NULL,
    arrest_boro CHAR(1),
    arrest_precinct INTEGER,
    offense_description VARCHAR(255),
    pd_description VARCHAR(255),
    perp_sex CHAR(1),
    perp_race VARCHAR(50),
    age_group VARCHAR(20),
    location GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arrests_date ON arrests(arrest_date);
CREATE INDEX IF NOT EXISTS idx_arrests_location ON arrests USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_arrests_boro ON arrests(arrest_boro);

-- ===========================================
-- Shootings Table
-- ===========================================
CREATE TABLE IF NOT EXISTS shootings (
    id SERIAL PRIMARY KEY,
    occur_date DATE NOT NULL,
    occur_time TIME,
    boro VARCHAR(20),
    precinct INTEGER,
    location_desc VARCHAR(100),
    location_class VARCHAR(100),
    statistical_murder_flag BOOLEAN,
    perp_sex CHAR(1),
    perp_age_group VARCHAR(20),
    perp_race VARCHAR(50),
    vic_sex CHAR(1),
    vic_age_group VARCHAR(20),
    vic_race VARCHAR(50),
    location GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shootings_date ON shootings(occur_date);
CREATE INDEX IF NOT EXISTS idx_shootings_location ON shootings USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_shootings_boro ON shootings(boro);

-- ===========================================
-- MTA Ridership Table
-- ===========================================
CREATE TABLE IF NOT EXISTS mta_ridership (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    subways_ridership BIGINT,
    subways_percent INTEGER,
    buses_ridership BIGINT,
    buses_percent INTEGER,
    lirr_ridership BIGINT,
    metro_north_ridership BIGINT,
    access_a_ride_trips BIGINT,
    bridges_tunnels_traffic BIGINT,
    staten_island_railway BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mta_date ON mta_ridership(date);

-- ===========================================
-- Taxi Zone Lookup Table (for coordinate mapping)
-- ===========================================
CREATE TABLE IF NOT EXISTS taxi_zones (
    location_id INTEGER PRIMARY KEY,
    zone_name VARCHAR(100),
    borough VARCHAR(50),
    centroid GEOMETRY(Point, 4326)
);

-- Insert taxi zone centroids
INSERT INTO taxi_zones (location_id, zone_name, borough, centroid) VALUES
(1, 'Newark Airport', 'EWR', ST_SetSRID(ST_MakePoint(-74.174, 40.693), 4326)),
(4, 'Alphabet City', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.985, 40.723), 4326)),
(7, 'Astoria', 'Queens', ST_SetSRID(ST_MakePoint(-73.926, 40.763), 4326)),
(12, 'Battery Park', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.016, 40.703), 4326)),
(13, 'Battery Park City', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.015, 40.712), 4326)),
(24, 'Bloomingdale', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.964, 40.802), 4326)),
(33, 'Borough Park', 'Brooklyn', ST_SetSRID(ST_MakePoint(-73.905, 40.854), 4326)),
(41, 'Central Harlem North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.942, 40.816), 4326)),
(42, 'Central Harlem South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.937, 40.808), 4326)),
(43, 'Central Park', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.968, 40.773), 4326)),
(45, 'Chinatown', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.998, 40.714), 4326)),
(48, 'Clinton East', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.989, 40.763), 4326)),
(50, 'Clinton West', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.996, 40.764), 4326)),
(68, 'East Chelsea', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.996, 40.748), 4326)),
(74, 'East Harlem North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.938, 40.803), 4326)),
(75, 'East Harlem South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.944, 40.793), 4326)),
(79, 'East Village', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.983, 40.727), 4326)),
(87, 'Financial District North', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.009, 40.709), 4326)),
(88, 'Financial District South', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.005, 40.704), 4326)),
(90, 'Flatiron', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.988, 40.741), 4326)),
(100, 'Garment District', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.991, 40.754), 4326)),
(107, 'Gramercy', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.982, 40.738), 4326)),
(113, 'Greenwich Village North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.997, 40.735), 4326)),
(114, 'Greenwich Village South', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.001, 40.729), 4326)),
(125, 'Hudson Sq', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.006, 40.727), 4326)),
(127, 'Inwood', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.924, 40.867), 4326)),
(128, 'JFK Airport', 'Queens', ST_SetSRID(ST_MakePoint(-73.789, 40.647), 4326)),
(132, 'Kips Bay', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.978, 40.742), 4326)),
(137, 'LaGuardia Airport', 'Queens', ST_SetSRID(ST_MakePoint(-73.875, 40.778), 4326)),
(138, 'Lenox Hill East', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.958, 40.768), 4326)),
(140, 'Lenox Hill West', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.965, 40.768), 4326)),
(141, 'Lincoln Square East', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.983, 40.773), 4326)),
(142, 'Lincoln Square West', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.987, 40.773), 4326)),
(143, 'Little Italy/NoLiTa', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.996, 40.723), 4326)),
(144, 'Long Island City/Queens Plaza', 'Queens', ST_SetSRID(ST_MakePoint(-73.942, 40.746), 4326)),
(148, 'Lower East Side', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.983, 40.715), 4326)),
(151, 'Manhattan Valley', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.976, 40.798), 4326)),
(152, 'Manhattanville', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.954, 40.816), 4326)),
(158, 'Meatpacking/West Village West', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.006, 40.739), 4326)),
(161, 'Midtown Center', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.982, 40.754), 4326)),
(162, 'Midtown East', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.972, 40.757), 4326)),
(163, 'Midtown North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.977, 40.764), 4326)),
(164, 'Midtown South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.988, 40.751), 4326)),
(166, 'Morningside Heights', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.959, 40.809), 4326)),
(170, 'Murray Hill', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.976, 40.748), 4326)),
(186, 'Penn Station/Madison Sq West', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.992, 40.749), 4326)),
(209, 'Roosevelt Island', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.951, 40.761), 4326)),
(211, 'SoHo', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.001, 40.723), 4326)),
(224, 'Stuy Town/PCV', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.976, 40.732), 4326)),
(229, 'Sutton Place/Turtle Bay North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.967, 40.756), 4326)),
(230, 'Times Sq/Theatre District', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.985, 40.757), 4326)),
(231, 'TriBeCa/Civic Center', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.009, 40.717), 4326)),
(232, 'Two Bridges/Seward Park', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.987, 40.713), 4326)),
(233, 'UN/Turtle Bay South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.969, 40.750), 4326)),
(234, 'Union Sq', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.990, 40.735), 4326)),
(236, 'Upper East Side North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.953, 40.776), 4326)),
(237, 'Upper East Side South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.959, 40.768), 4326)),
(238, 'Upper West Side North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.978, 40.787), 4326)),
(239, 'Upper West Side South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.980, 40.779), 4326)),
(243, 'Washington Heights North', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.938, 40.852), 4326)),
(244, 'Washington Heights South', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.939, 40.839), 4326)),
(246, 'West Chelsea/Hudson Yards', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.003, 40.749), 4326)),
(249, 'West Village', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.007, 40.734), 4326)),
(261, 'World Trade Center', 'Manhattan', ST_SetSRID(ST_MakePoint(-74.013, 40.712), 4326)),
(262, 'Yorkville East', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.948, 40.781), 4326)),
(263, 'Yorkville West', 'Manhattan', ST_SetSRID(ST_MakePoint(-73.953, 40.780), 4326)),
(264, 'Unknown', 'Unknown', ST_SetSRID(ST_MakePoint(-73.98, 40.75), 4326)),
(265, 'Unknown', 'Unknown', ST_SetSRID(ST_MakePoint(-73.98, 40.75), 4326))
ON CONFLICT (location_id) DO NOTHING;

-- ===========================================
-- ETL Metadata Table (for tracking loads)
-- ===========================================
CREATE TABLE IF NOT EXISTS etl_metadata (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    source_file VARCHAR(255),
    source_url VARCHAR(512),
    records_loaded BIGINT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_etl_table ON etl_metadata(table_name);
CREATE INDEX IF NOT EXISTS idx_etl_status ON etl_metadata(status);
