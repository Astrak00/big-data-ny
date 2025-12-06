import { readFileSync } from "fs";
import { join } from "path";
import { readParquet } from "parquet-wasm";
import { tableFromIPC } from "apache-arrow";

const DATA_DIR = join(import.meta.dir, "../../data_trunc");

export interface BikeTrip {
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

export interface TaxiTrip {
  VendorID: number;
  tpep_pickup_datetime: string;
  tpep_dropoff_datetime: string;
  passenger_count: number;
  trip_distance: number;
  pickup_longitude: number;
  pickup_latitude: number;
  dropoff_longitude: number;
  dropoff_latitude: number;
  PULocationID: number;
  DOLocationID: number;
  fare_amount: number;
  total_amount: number;
}

export interface Arrest {
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

// Parse CSV helper
function parseCSV(content: string): string[][] {
  const lines = content.trim().split("\n");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

// Load bike data
export function loadBikeData(limit = 1000): BikeTrip[] {
  const filePath = join(DATA_DIR, "JC-202412-citibike-tripdata.csv");
  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  const headers = rows[0];

  return rows
    .slice(1, limit + 1)
    .map((row) => ({
      ride_id: row[0],
      rideable_type: row[1],
      started_at: row[2],
      ended_at: row[3],
      start_station_name: row[4],
      start_station_id: row[5],
      end_station_name: row[6],
      end_station_id: row[7],
      start_lat: parseFloat(row[8]),
      start_lng: parseFloat(row[9]),
      end_lat: parseFloat(row[10]),
      end_lng: parseFloat(row[11]),
      member_casual: row[12],
    }))
    .filter((trip) => !isNaN(trip.start_lat) && !isNaN(trip.start_lng));
}

// Load arrests data
export function loadArrestsData(limit = 1000): Arrest[] {
  const filePath = join(DATA_DIR, "NYPD_Arrests_Data_1000.geojson");
  const content = readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(content);

  return geojson.features
    .filter((feature: any) => feature.geometry && feature.geometry.coordinates)
    .slice(0, limit)
    .map((feature: any) => ({
      type: "arrest" as const,
      coordinates: feature.geometry.coordinates as [number, number],
      properties: {
        perp_sex: feature.properties.perp_sex,
        age_group: feature.properties.age_group,
        arrest_boro: feature.properties.arrest_boro,
        ofns_desc: feature.properties.ofns_desc,
        pd_desc: feature.properties.pd_desc,
        perp_race: feature.properties.perp_race,
        arrest_date: feature.properties.arrest_date,
        arrest_precinct: feature.properties.arrest_precinct,
      },
    }));
}

// Load shooting data
export function loadShootingData(limit = 1000): Shooting[] {
  const filePath = join(DATA_DIR, "NYPD_Shooting_Incident_Data_1000.geojson");
  const content = readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(content);

  return geojson.features
    .filter((feature: any) => feature.geometry && feature.geometry.coordinates)
    .slice(0, limit)
    .map((feature: any) => ({
      type: "shooting" as const,
      coordinates: feature.geometry.coordinates as [number, number],
      properties: {
        perp_sex: feature.properties.perp_sex,
        perp_age_group: feature.properties.perp_age_group,
        perp_race: feature.properties.perp_race,
        vic_sex: feature.properties.vic_sex,
        vic_age_group: feature.properties.vic_age_group,
        vic_race: feature.properties.vic_race,
        boro: feature.properties.boro,
        precinct: feature.properties.precinct,
        occur_date: feature.properties.occur_date,
        occur_time: feature.properties.occur_time,
        statistical_murder_flag: feature.properties.statistical_murder_flag,
        loc_of_occur_desc: feature.properties.loc_of_occur_desc,
        loc_classfctn_desc: feature.properties.loc_classfctn_desc,
      },
    }));
}

// Load MTA ridership data
export function loadMTAData(): MTARidership[] {
  const filePath = join(
    DATA_DIR,
    "MTA_Daily_Ridership_Data__2020_-_2025_20251206.csv"
  );
  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);

  return rows.slice(1).map((row) => ({
    date: row[0],
    subways_ridership: parseInt(row[1]?.replace(/,/g, "") || "0"),
    subways_percent: parseInt(row[2]?.replace("%", "") || "0"),
    buses_ridership: parseInt(row[3]?.replace(/,/g, "") || "0"),
    buses_percent: parseInt(row[4]?.replace("%", "") || "0"),
    lirr_ridership: parseInt(row[5]?.replace(/,/g, "") || "0"),
    metro_north_ridership: parseInt(row[7]?.replace(/,/g, "") || "0"),
    access_a_ride_trips: parseInt(row[9]?.replace(/,/g, "") || "0"),
    bridges_tunnels_traffic: parseInt(row[11]?.replace(/,/g, "") || "0"),
    staten_island_railway: parseInt(row[13]?.replace(/,/g, "") || "0"),
  }));
}

// NYC Taxi Zone centroids for mapping zone IDs to coordinates
const TAXI_ZONES: Record<number, [number, number]> = {
  1: [-74.174, 40.693], // Newark Airport
  4: [-73.985, 40.723], // Alphabet City
  7: [-73.926, 40.763], // Astoria
  12: [-74.016, 40.703], // Battery Park
  13: [-74.015, 40.712], // Battery Park City
  24: [-73.964, 40.802], // Bloomingdale
  33: [-73.905, 40.854], // Borough Park - Bronx area
  41: [-73.942, 40.816], // Central Harlem North
  42: [-73.937, 40.808], // Central Harlem South
  43: [-73.968, 40.773], // Central Park
  45: [-73.998, 40.714], // Chinatown
  48: [-73.989, 40.763], // Clinton East
  50: [-73.996, 40.764], // Clinton West
  68: [-73.996, 40.748], // East Chelsea
  74: [-73.938, 40.803], // East Harlem North
  75: [-73.944, 40.793], // East Harlem South
  79: [-73.983, 40.727], // East Village
  87: [-74.009, 40.709], // Financial District North
  88: [-74.005, 40.704], // Financial District South
  90: [-73.988, 40.741], // Flatiron
  100: [-73.991, 40.754], // Garment District
  107: [-73.982, 40.738], // Gramercy
  113: [-73.997, 40.735], // Greenwich Village North
  114: [-74.001, 40.729], // Greenwich Village South
  125: [-74.006, 40.727], // Hudson Sq
  127: [-73.924, 40.867], // Inwood
  128: [-73.789, 40.647], // JFK Airport
  132: [-73.978, 40.742], // Kips Bay
  137: [-73.875, 40.778], // LaGuardia Airport
  138: [-73.958, 40.768], // Lenox Hill East
  140: [-73.965, 40.768], // Lenox Hill West
  141: [-73.983, 40.773], // Lincoln Square East
  142: [-73.987, 40.773], // Lincoln Square West
  143: [-73.996, 40.723], // Little Italy/NoLiTa
  144: [-73.942, 40.746], // Long Island City/Queens Plaza
  148: [-73.983, 40.715], // Lower East Side
  151: [-73.976, 40.798], // Manhattan Valley
  152: [-73.954, 40.816], // Manhattanville
  158: [-74.006, 40.739], // Meatpacking/West Village West
  161: [-73.982, 40.754], // Midtown Center
  162: [-73.972, 40.757], // Midtown East
  163: [-73.977, 40.764], // Midtown North
  164: [-73.988, 40.751], // Midtown South
  166: [-73.959, 40.809], // Morningside Heights
  170: [-73.976, 40.748], // Murray Hill
  186: [-73.992, 40.749], // Penn Station/Madison Sq West
  209: [-73.951, 40.761], // Roosevelt Island
  211: [-74.001, 40.723], // SoHo
  224: [-73.976, 40.732], // Stuy Town/PCV
  229: [-73.967, 40.756], // Sutton Place/Turtle Bay North
  230: [-73.985, 40.757], // Times Sq/Theatre District
  231: [-74.009, 40.717], // TriBeCa/Civic Center
  232: [-73.987, 40.713], // Two Bridges/Seward Park
  233: [-73.969, 40.750], // UN/Turtle Bay South
  234: [-73.990, 40.735], // Union Sq
  236: [-73.953, 40.776], // Upper East Side North
  237: [-73.959, 40.768], // Upper East Side South
  238: [-73.978, 40.787], // Upper West Side North
  239: [-73.980, 40.779], // Upper West Side South
  243: [-73.938, 40.852], // Washington Heights North
  244: [-73.939, 40.839], // Washington Heights South
  246: [-74.003, 40.749], // West Chelsea/Hudson Yards
  249: [-74.007, 40.734], // West Village
  261: [-74.013, 40.712], // World Trade Center
  262: [-73.948, 40.781], // Yorkville East
  263: [-73.953, 40.780], // Yorkville West
  264: [-73.776, 40.645], // NaN (Unknown - default to JFK area)
  265: [-73.776, 40.645], // NA (Unknown)
};

// Load taxi data from parquet file
export function loadTaxiData(limit = 1000): TaxiTrip[] {
  const filePath = join(DATA_DIR, "yellow_tripdata_2024-12.parquet");
  const buffer = readFileSync(filePath);
  const wasmTable = readParquet(buffer);
  const ipcStream = wasmTable.intoIPCStream();
  const arrowTable = tableFromIPC(ipcStream);

  const trips: TaxiTrip[] = [];
  const numRows = Math.min(limit, arrowTable.numRows);

  // Get columns
  const vendorCol = arrowTable.getChild("VendorID");
  const pickupCol = arrowTable.getChild("tpep_pickup_datetime");
  const dropoffCol = arrowTable.getChild("tpep_dropoff_datetime");
  const passengerCol = arrowTable.getChild("passenger_count");
  const distanceCol = arrowTable.getChild("trip_distance");
  const puLocationCol = arrowTable.getChild("PULocationID");
  const doLocationCol = arrowTable.getChild("DOLocationID");
  const fareCol = arrowTable.getChild("fare_amount");
  const totalCol = arrowTable.getChild("total_amount");

  for (let i = 0; i < numRows; i++) {
    const puZone = Number(puLocationCol?.get(i) ?? 0);
    const doZone = Number(doLocationCol?.get(i) ?? 0);

    // Get coordinates from zone lookup, fallback to Manhattan center
    const puCoords = TAXI_ZONES[puZone] || [-73.98, 40.75];
    const doCoords = TAXI_ZONES[doZone] || [-73.98, 40.75];

    // Convert timestamp (milliseconds) to ISO string
    const pickupTs = Number(pickupCol?.get(i) ?? 0);
    const dropoffTs = Number(dropoffCol?.get(i) ?? 0);

    trips.push({
      VendorID: Number(vendorCol?.get(i) ?? 0),
      tpep_pickup_datetime: new Date(pickupTs).toISOString(),
      tpep_dropoff_datetime: new Date(dropoffTs).toISOString(),
      passenger_count: Number(passengerCol?.get(i) ?? 0),
      trip_distance: Number(distanceCol?.get(i) ?? 0),
      pickup_longitude: puCoords[0],
      pickup_latitude: puCoords[1],
      dropoff_longitude: doCoords[0],
      dropoff_latitude: doCoords[1],
      PULocationID: puZone,
      DOLocationID: doZone,
      fare_amount: Number(fareCol?.get(i) ?? 0),
      total_amount: Number(totalCol?.get(i) ?? 0),
    });
  }

  return trips;
}

// Weather data fetcher using Open-Meteo API (free, no key needed)
export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
}

export async function fetchWeatherData(
  lat = 40.7128,
  lon = -74.006
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=America%2FNew_York`;

  try {
    const response = await fetch(url);
    const data = await response.json();

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

// Historical weather for specific dates
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
