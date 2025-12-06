import { readFileSync } from "fs";
import { join } from "path";

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

// Load taxi data - using NYC taxi zone centroids for visualization
// The actual parquet has PULocationID and DOLocationID instead of lat/lng
export function loadTaxiData(limit = 1000): TaxiTrip[] {
  // NYC Taxi Zone centroids (sample locations for major zones)
  const taxiZones: Record<number, [number, number]> = {
    1: [-74.174, 40.693], // Newark Airport
    4: [-73.789, 40.641], // Alphabet City
    7: [-74.006, 40.742], // Astoria
    12: [-73.984, 40.763], // Battery Park
    13: [-73.976, 40.752], // Battery Park City
    24: [-73.952, 40.769], // Bloomingdale
    41: [-73.99, 40.742], // Central Harlem
    43: [-73.969, 40.787], // Central Park
    45: [-73.986, 40.757], // Chinatown
    48: [-73.955, 40.776], // Clinton East
    50: [-73.991, 40.764], // Clinton West
    68: [-73.979, 40.752], // East Chelsea
    74: [-73.972, 40.749], // East Harlem North
    75: [-73.941, 40.795], // East Harlem South
    79: [-73.968, 40.721], // East Village
    87: [-73.983, 40.747], // Financial District North
    88: [-73.979, 40.707], // Financial District South
    90: [-73.967, 40.726], // Flatiron
    100: [-73.993, 40.759], // Garment District
    107: [-73.973, 40.746], // Gramercy
    113: [-73.976, 40.767], // Greenwich Village North
    114: [-73.998, 40.73], // Greenwich Village South
    125: [-73.996, 40.756], // Hudson Sq
    127: [-73.99, 40.756], // Inwood
    128: [-73.918, 40.872], // JFK Airport
    132: [-73.781, 40.644], // Kips Bay
    137: [-73.979, 40.74], // LaGuardia Airport
    138: [-73.873, 40.774], // Lenox Hill East
    140: [-73.962, 40.767], // Lenox Hill West
    141: [-73.959, 40.775], // Lincoln Square East
    142: [-73.986, 40.772], // Lincoln Square West
    143: [-73.98, 40.774], // Little Italy/NoLiTa
    144: [-73.998, 40.72], // Long Island City
    148: [-73.944, 40.749], // Lower East Side
    151: [-73.99, 40.715], // Manhattan Valley
    152: [-73.96, 40.798], // Manhattanville
    158: [-73.956, 40.817], // Meatpacking/West Village
    161: [-74.008, 40.74], // Midtown Center
    162: [-73.983, 40.755], // Midtown East
    163: [-73.974, 40.754], // Midtown North
    164: [-73.98, 40.762], // Midtown South
    166: [-73.99, 40.748], // Morningside Heights
    170: [-73.961, 40.805], // Murray Hill
    186: [-73.977, 40.747], // Penn Station/Madison Sq West
    209: [-73.949, 40.761], // Roosevelt Island
    211: [-73.999, 40.724], // SoHo
    224: [-73.982, 40.733], // Stuy Town/PCV
    229: [-73.967, 40.759], // Sutton Place/Turtle Bay North
    230: [-73.988, 40.758], // Times Sq/Theatre District
    231: [-74.009, 40.717], // TriBeCa/Civic Center
    232: [-73.991, 40.712], // Two Bridges/Seward Park
    233: [-73.969, 40.749], // UN/Turtle Bay South
    234: [-73.99, 40.735], // Union Sq
    236: [-73.957, 40.774], // Upper East Side North
    237: [-73.954, 40.769], // Upper East Side South
    238: [-73.978, 40.787], // Upper West Side North
    239: [-73.974, 40.779], // Upper West Side South
    243: [-73.938, 40.847], // Washington Heights North
    244: [-73.936, 40.835], // Washington Heights South
    246: [-74.001, 40.749], // West Chelsea/Hudson Yards
    249: [-74.008, 40.732], // West Village
    261: [-74.012, 40.713], // World Trade Center
    262: [-73.949, 40.779], // Yorkville East
    263: [-73.949, 40.779], // Yorkville West
  };

  // Generate sample taxi trips based on common routes
  const zones = Object.keys(taxiZones).map(Number);
  const trips: TaxiTrip[] = [];

  for (let i = 0; i < limit; i++) {
    const puZone = zones[Math.floor(Math.random() * zones.length)];
    const doZone = zones[Math.floor(Math.random() * zones.length)];
    const puCoords = taxiZones[puZone] || [-73.98, 40.75];
    const doCoords = taxiZones[doZone] || [-73.98, 40.75];

    trips.push({
      VendorID: Math.random() > 0.5 ? 1 : 2,
      tpep_pickup_datetime: `2024-12-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}T${String(Math.floor(Math.random() * 24)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
      tpep_dropoff_datetime: `2024-12-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}T${String(Math.floor(Math.random() * 24)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
      passenger_count: Math.floor(Math.random() * 4) + 1,
      trip_distance: Math.round((Math.random() * 10 + 0.5) * 10) / 10,
      pickup_longitude: puCoords[0] + (Math.random() - 0.5) * 0.01,
      pickup_latitude: puCoords[1] + (Math.random() - 0.5) * 0.01,
      dropoff_longitude: doCoords[0] + (Math.random() - 0.5) * 0.01,
      dropoff_latitude: doCoords[1] + (Math.random() - 0.5) * 0.01,
      PULocationID: puZone,
      DOLocationID: doZone,
      fare_amount: Math.round((Math.random() * 50 + 5) * 100) / 100,
      total_amount: Math.round((Math.random() * 70 + 10) * 100) / 100,
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
