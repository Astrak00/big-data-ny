/**
 * NYC Urban Data Explorer - Database Data Loader
 * ================================================
 * Loads data from PostgreSQL database instead of files
 */

import postgres from "postgres";

// Database connection
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://nyc_user:nyc_password@localhost:5432/nyc_urban_data";

const sql = postgres(DATABASE_URL);

// ===========================================
// Types
// ===========================================

export interface TaxiTrip {
  id: number;
  vendor_id: number;
  pickup_datetime: string;
  dropoff_datetime: string;
  passenger_count: number;
  trip_distance: number;
  pickup_longitude: number;
  pickup_latitude: number;
  dropoff_longitude: number;
  dropoff_latitude: number;
  pickup_location_id: number;
  dropoff_location_id: number;
  fare_amount: number;
  total_amount: number;
}

export interface BikeTrip {
  id: number;
  ride_id: string;
  rideable_type: string;
  started_at: string;
  ended_at: string;
  start_station_name: string;
  start_station_id: string;
  end_station_name: string;
  end_station_id: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  member_casual: string;
}

export interface Arrest {
  id: number;
  type: "arrest";
  coordinates: [number, number];
  properties: {
    perp_sex: string;
    age_group: string;
    arrest_boro: string;
    ofns_desc: string;
    pd_desc: string;
    perp_race: string;
    arrest_date: string;
    arrest_precinct: string;
  };
}

export interface Shooting {
  id: number;
  type: "shooting";
  coordinates: [number, number];
  properties: {
    perp_sex: string;
    perp_age_group: string;
    perp_race: string;
    vic_sex: string;
    vic_age_group: string;
    vic_race: string;
    boro: string;
    precinct: string;
    occur_date: string;
    occur_time: string;
    statistical_murder_flag: boolean;
    loc_of_occur_desc: string;
    loc_classfctn_desc: string;
  };
}

export interface MTARidership {
  date: string;
  subways_ridership: number;
  subways_percent: number;
  buses_ridership: number;
  buses_percent: number;
  lirr_ridership: number;
  metro_north_ridership: number;
  access_a_ride_trips: number;
  bridges_tunnels_traffic: number;
  staten_island_railway: number;
}

// ===========================================
// Data Loading Functions
// ===========================================

export async function loadTaxiData(
  limit: number = 1000,
  startDate?: string,
  endDate?: string
): Promise<TaxiTrip[]> {
  let query = sql`
    SELECT 
      id,
      vendor_id,
      pickup_datetime,
      dropoff_datetime,
      passenger_count,
      trip_distance,
      ST_X(pickup_point) as pickup_longitude,
      ST_Y(pickup_point) as pickup_latitude,
      ST_X(dropoff_point) as dropoff_longitude,
      ST_Y(dropoff_point) as dropoff_latitude,
      pickup_location_id,
      dropoff_location_id,
      fare_amount,
      total_amount
    FROM taxi_trips
    WHERE 1=1
  `;

  if (startDate && endDate) {
    query = sql`
      SELECT 
        id, vendor_id, pickup_datetime, dropoff_datetime,
        passenger_count, trip_distance,
        ST_X(pickup_point) as pickup_longitude,
        ST_Y(pickup_point) as pickup_latitude,
        ST_X(dropoff_point) as dropoff_longitude,
        ST_Y(dropoff_point) as dropoff_latitude,
        pickup_location_id, dropoff_location_id,
        fare_amount, total_amount
      FROM taxi_trips
      WHERE pickup_datetime::date >= ${startDate}::date
        AND pickup_datetime::date <= ${endDate}::date
      ORDER BY pickup_datetime DESC
      LIMIT ${limit}
    `;
  } else if (startDate) {
    query = sql`
      SELECT 
        id, vendor_id, pickup_datetime, dropoff_datetime,
        passenger_count, trip_distance,
        ST_X(pickup_point) as pickup_longitude,
        ST_Y(pickup_point) as pickup_latitude,
        ST_X(dropoff_point) as dropoff_longitude,
        ST_Y(dropoff_point) as dropoff_latitude,
        pickup_location_id, dropoff_location_id,
        fare_amount, total_amount
      FROM taxi_trips
      WHERE pickup_datetime::date = ${startDate}::date
      ORDER BY pickup_datetime DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT 
        id, vendor_id, pickup_datetime, dropoff_datetime,
        passenger_count, trip_distance,
        ST_X(pickup_point) as pickup_longitude,
        ST_Y(pickup_point) as pickup_latitude,
        ST_X(dropoff_point) as dropoff_longitude,
        ST_Y(dropoff_point) as dropoff_latitude,
        pickup_location_id, dropoff_location_id,
        fare_amount, total_amount
      FROM taxi_trips
      ORDER BY pickup_datetime DESC
      LIMIT ${limit}
    `;
  }

  const rows = await query;

  return rows.map((row: any) => ({
    id: row.id,
    vendor_id: row.vendor_id,
    pickup_datetime: row.pickup_datetime?.toISOString?.() || row.pickup_datetime,
    dropoff_datetime: row.dropoff_datetime?.toISOString?.() || row.dropoff_datetime,
    passenger_count: row.passenger_count,
    trip_distance: parseFloat(row.trip_distance) || 0,
    pickup_longitude: parseFloat(row.pickup_longitude) || 0,
    pickup_latitude: parseFloat(row.pickup_latitude) || 0,
    dropoff_longitude: parseFloat(row.dropoff_longitude) || 0,
    dropoff_latitude: parseFloat(row.dropoff_latitude) || 0,
    pickup_location_id: row.pickup_location_id,
    dropoff_location_id: row.dropoff_location_id,
    fare_amount: parseFloat(row.fare_amount) || 0,
    total_amount: parseFloat(row.total_amount) || 0,
  }));
}

export async function getTaxiCount(
  startDate?: string,
  endDate?: string
): Promise<number> {
  let result;

  if (startDate && endDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM taxi_trips
      WHERE pickup_datetime::date >= ${startDate}::date
        AND pickup_datetime::date <= ${endDate}::date
    `;
  } else if (startDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM taxi_trips
      WHERE pickup_datetime::date = ${startDate}::date
    `;
  } else {
    result = await sql`SELECT COUNT(*) as count FROM taxi_trips`;
  }

  return parseInt(result[0]?.count || "0");
}

export async function loadBikeData(
  limit: number = 1000,
  startDate?: string,
  endDate?: string
): Promise<BikeTrip[]> {
  let query;

  if (startDate && endDate) {
    query = sql`
      SELECT 
        id, ride_id, rideable_type, started_at, ended_at,
        start_station_name, start_station_id,
        end_station_name, end_station_id,
        ST_X(start_point) as start_lng,
        ST_Y(start_point) as start_lat,
        ST_X(end_point) as end_lng,
        ST_Y(end_point) as end_lat,
        member_casual
      FROM bike_trips
      WHERE started_at::date >= ${startDate}::date
        AND started_at::date <= ${endDate}::date
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
  } else if (startDate) {
    query = sql`
      SELECT 
        id, ride_id, rideable_type, started_at, ended_at,
        start_station_name, start_station_id,
        end_station_name, end_station_id,
        ST_X(start_point) as start_lng,
        ST_Y(start_point) as start_lat,
        ST_X(end_point) as end_lng,
        ST_Y(end_point) as end_lat,
        member_casual
      FROM bike_trips
      WHERE started_at::date = ${startDate}::date
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT 
        id, ride_id, rideable_type, started_at, ended_at,
        start_station_name, start_station_id,
        end_station_name, end_station_id,
        ST_X(start_point) as start_lng,
        ST_Y(start_point) as start_lat,
        ST_X(end_point) as end_lng,
        ST_Y(end_point) as end_lat,
        member_casual
      FROM bike_trips
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
  }

  const rows = await query;

  return rows.map((row: any) => ({
    id: row.id,
    ride_id: row.ride_id,
    rideable_type: row.rideable_type,
    started_at: row.started_at?.toISOString?.() || row.started_at,
    ended_at: row.ended_at?.toISOString?.() || row.ended_at,
    start_station_name: row.start_station_name,
    start_station_id: row.start_station_id,
    end_station_name: row.end_station_name,
    end_station_id: row.end_station_id,
    start_lat: row.start_lat != null ? parseFloat(row.start_lat) : null,
    start_lng: row.start_lng != null ? parseFloat(row.start_lng) : null,
    end_lat: row.end_lat != null ? parseFloat(row.end_lat) : null,
    end_lng: row.end_lng != null ? parseFloat(row.end_lng) : null,
    member_casual: row.member_casual,
  }));
}

export async function getBikeCount(
  startDate?: string,
  endDate?: string
): Promise<number> {
  let result;

  if (startDate && endDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM bike_trips
      WHERE started_at::date >= ${startDate}::date
        AND started_at::date <= ${endDate}::date
    `;
  } else if (startDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM bike_trips
      WHERE started_at::date = ${startDate}::date
    `;
  } else {
    result = await sql`SELECT COUNT(*) as count FROM bike_trips`;
  }

  return parseInt(result[0]?.count || "0");
}

export async function loadArrestsData(
  limit: number = 1000,
  startDate?: string,
  endDate?: string
): Promise<Arrest[]> {
  let query;

  if (startDate && endDate) {
    query = sql`
      SELECT 
        id, arrest_date, arrest_boro, arrest_precinct,
        offense_description, pd_description,
        perp_sex, perp_race, age_group,
        ST_X(location) as lng,
        ST_Y(location) as lat
      FROM arrests
      WHERE arrest_date >= ${startDate}::date
        AND arrest_date <= ${endDate}::date
      ORDER BY arrest_date DESC
      LIMIT ${limit}
    `;
  } else if (startDate) {
    query = sql`
      SELECT 
        id, arrest_date, arrest_boro, arrest_precinct,
        offense_description, pd_description,
        perp_sex, perp_race, age_group,
        ST_X(location) as lng,
        ST_Y(location) as lat
      FROM arrests
      WHERE arrest_date = ${startDate}::date
      ORDER BY arrest_date DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT 
        id, arrest_date, arrest_boro, arrest_precinct,
        offense_description, pd_description,
        perp_sex, perp_race, age_group,
        ST_X(location) as lng,
        ST_Y(location) as lat
      FROM arrests
      ORDER BY arrest_date DESC
      LIMIT ${limit}
    `;
  }

  const rows = await query;

  return rows.map((row: any) => ({
    id: row.id,
    type: "arrest" as const,
    coordinates: [parseFloat(row.lng) || 0, parseFloat(row.lat) || 0] as [number, number],
    properties: {
      perp_sex: row.perp_sex,
      age_group: row.age_group,
      arrest_boro: row.arrest_boro,
      ofns_desc: row.offense_description,
      pd_desc: row.pd_description,
      perp_race: row.perp_race,
      arrest_date: row.arrest_date?.toISOString?.()?.split("T")[0] || row.arrest_date,
      arrest_precinct: row.arrest_precinct?.toString(),
    },
  }));
}

export async function getArrestsCount(
  startDate?: string,
  endDate?: string
): Promise<number> {
  let result;

  if (startDate && endDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM arrests
      WHERE arrest_date >= ${startDate}::date
        AND arrest_date <= ${endDate}::date
    `;
  } else if (startDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM arrests
      WHERE arrest_date = ${startDate}::date
    `;
  } else {
    result = await sql`SELECT COUNT(*) as count FROM arrests`;
  }

  return parseInt(result[0]?.count || "0");
}

export async function loadShootingData(
  limit: number = 1000,
  startDate?: string,
  endDate?: string
): Promise<Shooting[]> {
  let query;

  if (startDate && endDate) {
    query = sql`
      SELECT 
        id, occur_date, occur_time, boro, precinct,
        location_desc, location_class, statistical_murder_flag,
        perp_sex, perp_age_group, perp_race,
        vic_sex, vic_age_group, vic_race,
        ST_X(location) as lng,
        ST_Y(location) as lat
      FROM shootings
      WHERE occur_date >= ${startDate}::date
        AND occur_date <= ${endDate}::date
      ORDER BY occur_date DESC
      LIMIT ${limit}
    `;
  } else if (startDate) {
    query = sql`
      SELECT 
        id, occur_date, occur_time, boro, precinct,
        location_desc, location_class, statistical_murder_flag,
        perp_sex, perp_age_group, perp_race,
        vic_sex, vic_age_group, vic_race,
        ST_X(location) as lng,
        ST_Y(location) as lat
      FROM shootings
      WHERE occur_date = ${startDate}::date
      ORDER BY occur_date DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT 
        id, occur_date, occur_time, boro, precinct,
        location_desc, location_class, statistical_murder_flag,
        perp_sex, perp_age_group, perp_race,
        vic_sex, vic_age_group, vic_race,
        ST_X(location) as lng,
        ST_Y(location) as lat
      FROM shootings
      ORDER BY occur_date DESC
      LIMIT ${limit}
    `;
  }

  const rows = await query;

  return rows.map((row: any) => ({
    id: row.id,
    type: "shooting" as const,
    coordinates: [parseFloat(row.lng) || 0, parseFloat(row.lat) || 0] as [number, number],
    properties: {
      perp_sex: row.perp_sex,
      perp_age_group: row.perp_age_group,
      perp_race: row.perp_race,
      vic_sex: row.vic_sex,
      vic_age_group: row.vic_age_group,
      vic_race: row.vic_race,
      boro: row.boro,
      precinct: row.precinct?.toString(),
      occur_date: row.occur_date?.toISOString?.()?.split("T")[0] || row.occur_date,
      occur_time: row.occur_time?.toString() || "",
      statistical_murder_flag: row.statistical_murder_flag || false,
      loc_of_occur_desc: row.location_desc,
      loc_classfctn_desc: row.location_class,
    },
  }));
}

export async function getShootingsCount(
  startDate?: string,
  endDate?: string
): Promise<number> {
  let result;

  if (startDate && endDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM shootings
      WHERE occur_date >= ${startDate}::date
        AND occur_date <= ${endDate}::date
    `;
  } else if (startDate) {
    result = await sql`
      SELECT COUNT(*) as count FROM shootings
      WHERE occur_date = ${startDate}::date
    `;
  } else {
    result = await sql`SELECT COUNT(*) as count FROM shootings`;
  }

  return parseInt(result[0]?.count || "0");
}

export async function loadMTAData(
  startDate?: string,
  endDate?: string
): Promise<MTARidership[]> {
  let query;

  if (startDate && endDate) {
    query = sql`
      SELECT * FROM mta_ridership
      WHERE date >= ${startDate}::date
        AND date <= ${endDate}::date
      ORDER BY date ASC
    `;
  } else if (startDate) {
    query = sql`
      SELECT * FROM mta_ridership
      WHERE date = ${startDate}::date
      ORDER BY date ASC
    `;
  } else {
    query = sql`
      SELECT * FROM mta_ridership
      ORDER BY date DESC
      LIMIT 30
    `;
  }

  const rows = await query;

  return rows.map((row: any) => ({
    date: formatMTADate(row.date),
    subways_ridership: parseInt(row.subways_ridership) || 0,
    subways_percent: parseInt(row.subways_percent) || 0,
    buses_ridership: parseInt(row.buses_ridership) || 0,
    buses_percent: parseInt(row.buses_percent) || 0,
    lirr_ridership: parseInt(row.lirr_ridership) || 0,
    metro_north_ridership: parseInt(row.metro_north_ridership) || 0,
    access_a_ride_trips: parseInt(row.access_a_ride_trips) || 0,
    bridges_tunnels_traffic: parseInt(row.bridges_tunnels_traffic) || 0,
    staten_island_railway: parseInt(row.staten_island_railway) || 0,
  }));
}

function formatMTADate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

export async function getArrestsByBorough(
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  let query;

  const boroMap: Record<string, string> = {
    M: "Manhattan",
    K: "Brooklyn",
    Q: "Queens",
    B: "Bronx",
    S: "Staten Island",
  };

  if (startDate && endDate) {
    query = sql`
      SELECT arrest_boro, COUNT(*) as count
      FROM arrests
      WHERE arrest_date >= ${startDate}::date
        AND arrest_date <= ${endDate}::date
      GROUP BY arrest_boro
    `;
  } else if (startDate) {
    query = sql`
      SELECT arrest_boro, COUNT(*) as count
      FROM arrests
      WHERE arrest_date = ${startDate}::date
      GROUP BY arrest_boro
    `;
  } else {
    query = sql`
      SELECT arrest_boro, COUNT(*) as count
      FROM arrests
      GROUP BY arrest_boro
    `;
  }

  const rows = await query;
  const result: Record<string, number> = {};

  for (const row of rows) {
    const boro = boroMap[row.arrest_boro] || "Unknown";
    result[boro] = parseInt(row.count) || 0;
  }

  return result;
}

export async function getShootingsByBorough(
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  let query;

  if (startDate && endDate) {
    query = sql`
      SELECT boro, COUNT(*) as count
      FROM shootings
      WHERE occur_date >= ${startDate}::date
        AND occur_date <= ${endDate}::date
      GROUP BY boro
    `;
  } else if (startDate) {
    query = sql`
      SELECT boro, COUNT(*) as count
      FROM shootings
      WHERE occur_date = ${startDate}::date
      GROUP BY boro
    `;
  } else {
    query = sql`
      SELECT boro, COUNT(*) as count
      FROM shootings
      GROUP BY boro
    `;
  }

  const rows = await query;
  const result: Record<string, number> = {};

  // Normalize borough names to proper case to match arrests data
  const normalizeBorough = (boro: string): string => {
    if (!boro) return "Unknown";
    // Handle uppercase names like "MANHATTAN" -> "Manhattan", "STATEN ISLAND" -> "Staten Island"
    return boro
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  for (const row of rows) {
    const boro = normalizeBorough(row.boro);
    result[boro] = parseInt(row.count) || 0;
  }

  return result;
}

export async function getDateRange(): Promise<{ min: string; max: string }> {
  try {
    // Get min/max dates from each table separately to handle empty tables
    const result = await sql`
      SELECT 
        (
          SELECT MIN(d) FROM (
            SELECT MIN(pickup_datetime::date) as d FROM taxi_trips WHERE pickup_datetime IS NOT NULL
            UNION ALL
            SELECT MIN(started_at::date) FROM bike_trips WHERE started_at IS NOT NULL
            UNION ALL
            SELECT MIN(arrest_date) FROM arrests WHERE arrest_date IS NOT NULL
            UNION ALL
            SELECT MIN(occur_date) FROM shootings WHERE occur_date IS NOT NULL
            UNION ALL
            SELECT MIN(date) FROM mta_ridership WHERE date IS NOT NULL
          ) dates WHERE d IS NOT NULL
        ) as min_date,
        (
          SELECT MAX(d) FROM (
            SELECT MAX(pickup_datetime::date) as d FROM taxi_trips WHERE pickup_datetime IS NOT NULL
            UNION ALL
            SELECT MAX(started_at::date) FROM bike_trips WHERE started_at IS NOT NULL
            UNION ALL
            SELECT MAX(arrest_date) FROM arrests WHERE arrest_date IS NOT NULL
            UNION ALL
            SELECT MAX(occur_date) FROM shootings WHERE occur_date IS NOT NULL
            UNION ALL
            SELECT MAX(date) FROM mta_ridership WHERE date IS NOT NULL
          ) dates WHERE d IS NOT NULL
        ) as max_date
    `;

    const minDate = result[0]?.min_date;
    const maxDate = result[0]?.max_date;

    return {
      min: minDate?.toISOString?.()?.split("T")[0] || "2020-01-01",
      max: maxDate?.toISOString?.()?.split("T")[0] || new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Error getting date range:", error);
    return {
      min: "2020-01-01",
      max: new Date().toISOString().split("T")[0],
    };
  }
}

// ===========================================
// Weather API (unchanged - real-time)
// ===========================================

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
}

const weatherCodes: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export async function fetchWeatherData(
  lat = 40.7128,
  lon = -74.006
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=America%2FNew_York`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      description: weatherCodes[data.current.weather_code] || "Unknown",
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return {
      temperature: 0,
      humidity: 0,
      precipitation: 0,
      windSpeed: 0,
      weatherCode: 0,
      description: "Unable to fetch weather",
    };
  }
}

export async function fetchHistoricalWeather(
  date: string,
  lat = 40.7128,
  lon = -74.006
): Promise<WeatherData> {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max&timezone=America%2FNew_York`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      temperature: data.daily?.temperature_2m_mean?.[0] || 0,
      humidity: 0,
      precipitation: data.daily?.precipitation_sum?.[0] || 0,
      windSpeed: data.daily?.wind_speed_10m_max?.[0] || 0,
      weatherCode: 0,
      description: "Historical data",
    };
  } catch (error) {
    console.error("Error fetching historical weather:", error);
    return {
      temperature: 0,
      humidity: 0,
      precipitation: 0,
      windSpeed: 0,
      weatherCode: 0,
      description: "Unable to fetch weather",
    };
  }
}

// Close database connection gracefully
export async function closeDatabase(): Promise<void> {
  await sql.end();
}

// ===========================================
// Route Planning Types
// ===========================================

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface TransportStats {
  avgCostPerMile: number;
  avgSpeedMph: number;
  avgDurationMinutes: number;
  sampleSize: number;
}

export interface CrimeStats {
  arrestCount: number;
  shootingCount: number;
  totalCrimeScore: number;
  crimePerSqMile: number;
}

export interface RouteSegment {
  geometry: [number, number][];
  distance: number; // meters
  duration: number; // seconds
  mode: "driving" | "cycling" | "walking" | "transit";
}

export interface RouteOption {
  mode: "taxi" | "bike" | "metro" | "walking";
  segments: RouteSegment[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  estimatedCost: number; // dollars
  crimeScore: number; // lower is safer
  geometry: [number, number][];
}

export interface RouteResult {
  origin: RoutePoint;
  destination: RoutePoint;
  options: RouteOption[];
  recommendation: {
    fastest: RouteOption | null;
    cheapest: RouteOption | null;
    safest: RouteOption | null;
  };
}

// ===========================================
// Route Planning Functions
// ===========================================

/**
 * Fetch route from OSRM (Open Source Routing Machine)
 * Using the public demo server for walking, cycling, and driving
 */
export async function fetchOSRMRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  mode: "driving" | "cycling" | "walking"
): Promise<RouteSegment | null> {
  const routes = await fetchOSRMRoutes(origin, destination, mode, 1);
  return routes.length > 0 ? routes[0] : null;
}

/**
 * Fetch multiple route alternatives from OSRM
 * Returns up to `maxAlternatives` different routes
 */
export async function fetchOSRMRoutes(
  origin: RoutePoint,
  destination: RoutePoint,
  mode: "driving" | "cycling" | "walking",
  maxAlternatives: number = 3
): Promise<RouteSegment[]> {
  const profile = mode === "driving" ? "car" : mode === "cycling" ? "bike" : "foot";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("OSRM routing failed:", data);
      return [];
    }

    return data.routes.slice(0, maxAlternatives).map((route: any) => ({
      geometry: route.geometry.coordinates as [number, number][],
      distance: route.distance,
      duration: route.duration,
      mode: mode,
    }));
  } catch (error) {
    console.error("Error fetching OSRM routes:", error);
    return [];
  }
}

/**
 * Get average taxi statistics from the database
 * Used to estimate taxi costs and travel times
 */
export async function getTaxiStats(): Promise<TransportStats> {
  try {
    const result = await sql`
      SELECT 
        AVG(CASE WHEN trip_distance > 0 THEN total_amount / trip_distance ELSE NULL END) as avg_cost_per_mile,
        AVG(CASE 
          WHEN trip_distance > 0 AND dropoff_datetime > pickup_datetime 
          THEN trip_distance / (EXTRACT(EPOCH FROM (dropoff_datetime - pickup_datetime)) / 3600)
          ELSE NULL 
        END) as avg_speed_mph,
        AVG(EXTRACT(EPOCH FROM (dropoff_datetime - pickup_datetime)) / 60) as avg_duration_minutes,
        COUNT(*) as sample_size
      FROM taxi_trips
      WHERE trip_distance > 0.1 
        AND trip_distance < 100
        AND total_amount > 0
        AND total_amount < 500
        AND dropoff_datetime > pickup_datetime
    `;

    return {
      avgCostPerMile: parseFloat(result[0]?.avg_cost_per_mile) || 3.5,
      avgSpeedMph: parseFloat(result[0]?.avg_speed_mph) || 12,
      avgDurationMinutes: parseFloat(result[0]?.avg_duration_minutes) || 15,
      sampleSize: parseInt(result[0]?.sample_size) || 0,
    };
  } catch (error) {
    console.error("Error getting taxi stats:", error);
    return {
      avgCostPerMile: 3.5, // NYC taxi default ~$3.50/mile
      avgSpeedMph: 12, // Average NYC taxi speed
      avgDurationMinutes: 15,
      sampleSize: 0,
    };
  }
}

/**
 * Get bike sharing statistics from the database
 * Used to estimate bike travel times
 */
export async function getBikeStats(): Promise<TransportStats> {
  try {
    const result = await sql`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) as avg_duration_minutes,
        COUNT(*) as sample_size
      FROM bike_trips
      WHERE ended_at > started_at
        AND EXTRACT(EPOCH FROM (ended_at - started_at)) > 60
        AND EXTRACT(EPOCH FROM (ended_at - started_at)) < 7200
    `;

    // Citi Bike pricing: $4.49 single ride (30 min) or $0.26/min after
    // Average speed: ~10 mph for city cycling
    return {
      avgCostPerMile: 0.45, // Estimated based on typical ride lengths
      avgSpeedMph: 10,
      avgDurationMinutes: parseFloat(result[0]?.avg_duration_minutes) || 15,
      sampleSize: parseInt(result[0]?.sample_size) || 0,
    };
  } catch (error) {
    console.error("Error getting bike stats:", error);
    return {
      avgCostPerMile: 0.45,
      avgSpeedMph: 10,
      avgDurationMinutes: 15,
      sampleSize: 0,
    };
  }
}

/**
 * Get MTA subway/metro statistics
 * Flat fare pricing with average travel speeds
 */
export async function getMetroStats(): Promise<TransportStats> {
  // MTA flat fare: $2.90 (as of 2024)
  // Average subway speed: ~17 mph including stops
  return {
    avgCostPerMile: 0, // Flat fare, calculated separately
    avgSpeedMph: 17,
    avgDurationMinutes: 20,
    sampleSize: 0,
  };
}

/**
 * Calculate crime density along a route corridor
 * Uses PostGIS to find crimes within a buffer of the route
 */
export async function getCrimeAlongRoute(
  routeGeometry: [number, number][],
  bufferMeters: number = 200
): Promise<CrimeStats> {
  if (!routeGeometry || routeGeometry.length < 2) {
    return { arrestCount: 0, shootingCount: 0, totalCrimeScore: 0, crimePerSqMile: 0 };
  }

  try {
    // Create a LineString from the route coordinates
    const lineStringCoords = routeGeometry
      .map((coord) => `${coord[0]} ${coord[1]}`)
      .join(",");
    
    const lineString = `LINESTRING(${lineStringCoords})`;

    // Query arrests within buffer of the route
    const arrestResult = await sql`
      SELECT COUNT(*) as count
      FROM arrests
      WHERE ST_DWithin(
        location::geography,
        ST_GeomFromText(${lineString}, 4326)::geography,
        ${bufferMeters}
      )
    `;

    // Query shootings within buffer of the route
    const shootingResult = await sql`
      SELECT COUNT(*) as count
      FROM shootings
      WHERE ST_DWithin(
        location::geography,
        ST_GeomFromText(${lineString}, 4326)::geography,
        ${bufferMeters}
      )
    `;

    const arrestCount = parseInt(arrestResult[0]?.count) || 0;
    const shootingCount = parseInt(shootingResult[0]?.count) || 0;

    // Calculate route length and buffer area for density
    const lengthResult = await sql`
      SELECT ST_Length(ST_GeomFromText(${lineString}, 4326)::geography) as length_meters
    `;
    const routeLengthMeters = parseFloat(lengthResult[0]?.length_meters) || 1000;
    
    // Buffer area in square miles (approximate)
    const bufferAreaSqMiles = (routeLengthMeters * bufferMeters * 2) / 2589988; // sq meters to sq miles

    // Crime score: shootings weighted 5x more than arrests
    const totalCrimeScore = arrestCount + shootingCount * 5;
    const crimePerSqMile = bufferAreaSqMiles > 0 ? totalCrimeScore / bufferAreaSqMiles : 0;

    return {
      arrestCount,
      shootingCount,
      totalCrimeScore,
      crimePerSqMile,
    };
  } catch (error) {
    console.error("Error calculating crime along route:", error);
    return { arrestCount: 0, shootingCount: 0, totalCrimeScore: 0, crimePerSqMile: 0 };
  }
}

/**
 * Find nearby bike stations to a point
 */
export async function findNearbyBikeStations(
  point: RoutePoint,
  radiusMeters: number = 500
): Promise<{ stationName: string; lat: number; lng: number; distance: number }[]> {
  try {
    const result = await sql`
      SELECT DISTINCT ON (start_station_name)
        start_station_name as station_name,
        ST_Y(start_point) as lat,
        ST_X(start_point) as lng,
        ST_Distance(
          start_point::geography,
          ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography
        ) as distance
      FROM bike_trips
      WHERE start_point IS NOT NULL
        AND ST_DWithin(
          start_point::geography,
          ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY start_station_name, distance
      LIMIT 5
    `;

    return result.map((row: any) => ({
      stationName: row.station_name,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      distance: parseFloat(row.distance),
    }));
  } catch (error) {
    console.error("Error finding nearby bike stations:", error);
    return [];
  }
}

/**
 * Main route planning function
 * Calculates multiple route options with different transport modes and alternative paths
 */
export async function planRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  optimizeFor: "fastest" | "cheapest" | "safest" = "fastest"
): Promise<RouteResult> {
  const result: RouteResult = {
    origin,
    destination,
    options: [],
    recommendation: {
      fastest: null,
      cheapest: null,
      safest: null,
    },
  };

  // Get transport statistics
  const [taxiStats, bikeStats, metroStats] = await Promise.all([
    getTaxiStats(),
    getBikeStats(),
    getMetroStats(),
  ]);

  // Calculate straight-line distance for estimations
  const straightLineDistanceKm = haversineDistance(origin, destination);
  const straightLineDistanceMiles = straightLineDistanceKm * 0.621371;

  // 1. Taxi Routes (driving) - get multiple alternatives
  const taxiRoutes = await fetchOSRMRoutes(origin, destination, "driving", 3);
  for (let i = 0; i < taxiRoutes.length; i++) {
    const taxiRoute = taxiRoutes[i];
    const distanceMiles = taxiRoute.distance / 1609.34;
    // NYC Taxi fare: $3 base + $2.50/mile + time charges
    const baseFare = 3.0;
    const mileageCharge = distanceMiles * 2.5;
    const timeCharge = (taxiRoute.duration / 60) * 0.5; // ~$0.50/min in traffic
    const estimatedCost = baseFare + mileageCharge + timeCharge;
    
    const crimeStats = await getCrimeAlongRoute(taxiRoute.geometry);

    const taxiOption: RouteOption = {
      mode: "taxi",
      segments: [taxiRoute],
      totalDistance: taxiRoute.distance,
      totalDuration: taxiRoute.duration,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      crimeScore: crimeStats.totalCrimeScore,
      geometry: taxiRoute.geometry,
    };
    result.options.push(taxiOption);
  }

  // 2. Bike Routes (cycling) - get multiple alternatives
  const bikeRoutes = await fetchOSRMRoutes(origin, destination, "cycling", 3);
  for (let i = 0; i < bikeRoutes.length; i++) {
    const bikeRoute = bikeRoutes[i];
    const durationMinutes = bikeRoute.duration / 60;
    // Citi Bike: $4.49 for 30 min, $0.26/min after
    let estimatedCost = 4.49;
    if (durationMinutes > 30) {
      estimatedCost += (durationMinutes - 30) * 0.26;
    }

    const crimeStats = await getCrimeAlongRoute(bikeRoute.geometry);

    const bikeOption: RouteOption = {
      mode: "bike",
      segments: [bikeRoute],
      totalDistance: bikeRoute.distance,
      totalDuration: bikeRoute.duration,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      crimeScore: crimeStats.totalCrimeScore,
      geometry: bikeRoute.geometry,
    };
    result.options.push(bikeOption);
  }

  // 3. Walking Route (single, for reference only - not used in cost comparison)
  const walkRoute = await fetchOSRMRoute(origin, destination, "walking");
  if (walkRoute) {
    const crimeStats = await getCrimeAlongRoute(walkRoute.geometry);

    const walkOption: RouteOption = {
      mode: "walking",
      segments: [walkRoute],
      totalDistance: walkRoute.distance,
      totalDuration: walkRoute.duration,
      estimatedCost: 0,
      crimeScore: crimeStats.totalCrimeScore,
      geometry: walkRoute.geometry,
    };
    result.options.push(walkOption);
  }

  // 4. Metro Route (simplified - walking to/from stations + transit time estimate)
  // For metro, we estimate based on straight-line distance and average subway speed
  if (straightLineDistanceMiles > 0.5) {
    // Only suggest metro for longer distances
    const metroDistanceEstimate = straightLineDistanceKm * 1.3; // Account for non-direct routes
    const metroDurationMinutes = (metroDistanceEstimate / 1.609) / metroStats.avgSpeedMph * 60;
    const walkToStationMinutes = 5; // Estimated walk to/from subway
    const waitTime = 5; // Average wait time

    // Use walking route geometry as approximation (metro follows similar paths in NYC)
    const metroGeometry = walkRoute?.geometry || [];
    const crimeStats = await getCrimeAlongRoute(metroGeometry);

    const metroOption: RouteOption = {
      mode: "metro",
      segments: [],
      totalDistance: metroDistanceEstimate * 1000,
      totalDuration: (metroDurationMinutes + walkToStationMinutes * 2 + waitTime) * 60,
      estimatedCost: 2.9, // MTA flat fare
      crimeScore: crimeStats.totalCrimeScore,
      geometry: metroGeometry,
    };
    result.options.push(metroOption);
  }

  // Determine recommendations - ensure different routes when possible
  if (result.options.length > 0) {
    // Fastest - consider all options
    result.recommendation.fastest = result.options.reduce((prev, curr) =>
      curr.totalDuration < prev.totalDuration ? curr : prev
    );

    // Cheapest - exclude walking (free but slow, not a fair comparison)
    const paidOptions = result.options.filter(opt => opt.mode !== "walking");
    if (paidOptions.length > 0) {
      result.recommendation.cheapest = paidOptions.reduce((prev, curr) =>
        curr.estimatedCost < prev.estimatedCost ? curr : prev
      );
    } else {
      // Fallback if only walking is available
      result.recommendation.cheapest = result.options[0];
    }

    // Safest (lowest crime score) - prefer a different route than fastest if possible
    const sortedBySafety = [...result.options].sort((a, b) => a.crimeScore - b.crimeScore);
    result.recommendation.safest = sortedBySafety[0];
    
    // If safest is same as fastest, try to pick the next safest option
    if (result.recommendation.safest === result.recommendation.fastest && sortedBySafety.length > 1) {
      // Check if there's a meaningfully different alternative
      const alternative = sortedBySafety.find(opt => 
        opt !== result.recommendation.fastest && 
        opt.crimeScore <= sortedBySafety[0].crimeScore * 1.2 // Within 20% of safest
      );
      if (alternative) {
        result.recommendation.safest = alternative;
      }
    }
    
    // If cheapest is same as fastest, try to pick a cheaper alternative
    if (result.recommendation.cheapest === result.recommendation.fastest && paidOptions.length > 1) {
      const sortedByCost = [...paidOptions].sort((a, b) => a.estimatedCost - b.estimatedCost);
      const alternative = sortedByCost.find(opt => 
        opt !== result.recommendation.fastest &&
        opt.estimatedCost <= sortedByCost[0].estimatedCost * 1.1 // Within 10% of cheapest
      );
      if (alternative) {
        result.recommendation.cheapest = alternative;
      }
    }
  }

  return result;
}

/**
 * Calculate haversine distance between two points in kilometers
 */
function haversineDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ===========================================
// Weather Grid for Map Overlay
// ===========================================

export interface WeatherGridPoint {
  lat: number;
  lon: number;
  precipitation: number;
  temperature: number;
}

export interface WeatherGridData {
  points: WeatherGridPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  date: string;
  maxPrecipitation: number;
}

/**
 * Fetches weather grid data for the NYC area from Open-Meteo.
 * Creates a grid of points covering the bounding box of NYC.
 */
export async function fetchWeatherGrid(
  date?: string
): Promise<WeatherGridData> {
  // NYC bounding box (approximate)
  const bounds = {
    north: 40.92,
    south: 40.49,
    east: -73.70,
    west: -74.26,
  };

  // Grid resolution: 8x8 grid points for finer detail
  const gridSize = 8;
  const latStep = (bounds.north - bounds.south) / (gridSize - 1);
  const lonStep = (bounds.east - bounds.west) / (gridSize - 1);

  const points: WeatherGridPoint[] = [];
  const today = new Date().toISOString().split("T")[0];
  const isHistorical = date && date < today;

  // Collect all lat/lon pairs for batch request
  const lats: number[] = [];
  const lons: number[] = [];

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;
      lats.push(lat);
      lons.push(lon);
    }
  }

  try {
    let maxPrecipitation = 0;

    // Fetch all points in parallel for much faster loading
    const fetchPromises = lats.map(async (lat, i) => {
      const lon = lons[i];
      
      if (isHistorical && date) {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=precipitation_sum,temperature_2m_mean&timezone=America%2FNew_York`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          return {
            lat,
            lon,
            precipitation: data.daily?.precipitation_sum?.[0] || 0,
            temperature: data.daily?.temperature_2m_mean?.[0] || 0,
          };
        } catch (e) {
          return { lat, lon, precipitation: 0, temperature: 0 };
        }
      } else {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,temperature_2m&timezone=America%2FNew_York`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          return {
            lat,
            lon,
            precipitation: data.current?.precipitation || 0,
            temperature: data.current?.temperature_2m || 0,
          };
        } catch (e) {
          return { lat, lon, precipitation: 0, temperature: 0 };
        }
      }
    });

    const results = await Promise.all(fetchPromises);
    
    for (const point of results) {
      points.push(point);
      if (point.precipitation > maxPrecipitation) {
        maxPrecipitation = point.precipitation;
      }
    }

    return {
      points,
      bounds,
      date: date || today,
      maxPrecipitation,
    };
  } catch (error) {
    console.error("Error fetching weather grid:", error);
    return {
      points: [],
      bounds,
      date: date || today,
      maxPrecipitation: 0,
    };
  }
}
