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
    start_lat: parseFloat(row.start_lat) || 0,
    start_lng: parseFloat(row.start_lng) || 0,
    end_lat: parseFloat(row.end_lat) || 0,
    end_lng: parseFloat(row.end_lng) || 0,
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

  for (const row of rows) {
    result[row.boro || "Unknown"] = parseInt(row.count) || 0;
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

  // Grid resolution: 5x5 grid points
  const latStep = (bounds.north - bounds.south) / 4;
  const lonStep = (bounds.east - bounds.west) / 4;

  const points: WeatherGridPoint[] = [];
  const today = new Date().toISOString().split("T")[0];
  const isHistorical = date && date < today;

  // Collect all lat/lon pairs for batch request
  const lats: number[] = [];
  const lons: number[] = [];

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;
      lats.push(lat);
      lons.push(lon);
    }
  }

  try {
    let maxPrecipitation = 0;

    if (isHistorical && date) {
      // Use archive API for historical data
      // Fetch each point individually (Open-Meteo archive doesn't support multi-location)
      for (let i = 0; i < lats.length; i++) {
        const lat = lats[i];
        const lon = lons[i];
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=precipitation_sum,temperature_2m_mean&timezone=America%2FNew_York`;

        try {
          const response = await fetch(url);
          const data = await response.json();
          const precip = data.daily?.precipitation_sum?.[0] || 0;
          const temp = data.daily?.temperature_2m_mean?.[0] || 0;

          points.push({
            lat,
            lon,
            precipitation: precip,
            temperature: temp,
          });

          if (precip > maxPrecipitation) maxPrecipitation = precip;
        } catch (e) {
          points.push({ lat, lon, precipitation: 0, temperature: 0 });
        }
      }
    } else {
      // Use forecast API for current/future data
      // Fetch each point individually
      for (let i = 0; i < lats.length; i++) {
        const lat = lats[i];
        const lon = lons[i];
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,temperature_2m&timezone=America%2FNew_York`;

        try {
          const response = await fetch(url);
          const data = await response.json();
          const precip = data.current?.precipitation || 0;
          const temp = data.current?.temperature_2m || 0;

          points.push({
            lat,
            lon,
            precipitation: precip,
            temperature: temp,
          });

          if (precip > maxPrecipitation) maxPrecipitation = precip;
        } catch (e) {
          points.push({ lat, lon, precipitation: 0, temperature: 0 });
        }
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
