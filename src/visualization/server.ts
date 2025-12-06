import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import {
  loadBikeData,
  loadArrestsData,
  loadShootingData,
  loadMTAData,
  loadTaxiData,
  fetchWeatherData,
  fetchHistoricalWeather,
} from "./data-loader";

const app = new Hono();

// Enable CORS
app.use("/*", cors());

// Serve static files
app.use("/static/*", serveStatic({ root: "./src/visualization" }));

// Cache for data (to avoid reloading on every request)
let bikeDataCache: ReturnType<typeof loadBikeData> | null = null;
let arrestsDataCache: ReturnType<typeof loadArrestsData> | null = null;
let shootingDataCache: ReturnType<typeof loadShootingData> | null = null;
let mtaDataCache: ReturnType<typeof loadMTAData> | null = null;
let taxiDataCache: ReturnType<typeof loadTaxiData> | null = null;

// Helper to parse date from various formats
function parseDate(dateStr: string): string {
  // Returns YYYY-MM-DD format
  if (dateStr.includes("T")) {
    return dateStr.split("T")[0];
  }
  if (dateStr.includes(" ")) {
    return dateStr.split(" ")[0];
  }
  return dateStr;
}

// Helper to filter by date
function matchesDate(itemDate: string | undefined, filterDate: string): boolean {
  if (!itemDate || !filterDate) return true;
  const itemDateParsed = parseDate(itemDate);
  return itemDateParsed === filterDate;
}

// API Routes

// Get bike trip data
app.get("/api/bike", (c) => {
  const limit = parseInt(c.req.query("limit") || "500");
  const date = c.req.query("date");
  
  if (!bikeDataCache) {
    bikeDataCache = loadBikeData(5000);
  }
  
  let data = bikeDataCache;
  if (date) {
    data = data.filter(trip => matchesDate(trip.started_at, date));
  }
  
  return c.json({
    success: true,
    count: Math.min(limit, data.length),
    data: data.slice(0, limit),
  });
});

// Get taxi trip data
app.get("/api/taxi", (c) => {
  const limit = parseInt(c.req.query("limit") || "500");
  const date = c.req.query("date");
  
  if (!taxiDataCache) {
    taxiDataCache = loadTaxiData(5000);
  }
  
  let data = taxiDataCache;
  if (date) {
    data = data.filter(trip => matchesDate(trip.tpep_pickup_datetime, date));
  }
  
  return c.json({
    success: true,
    count: Math.min(limit, data.length),
    data: data.slice(0, limit),
  });
});

// Get arrests data
app.get("/api/arrests", (c) => {
  const limit = parseInt(c.req.query("limit") || "500");
  const date = c.req.query("date");
  
  if (!arrestsDataCache) {
    arrestsDataCache = loadArrestsData(1000);
  }
  
  let data = arrestsDataCache;
  if (date) {
    data = data.filter(arrest => matchesDate(arrest.properties.arrest_date, date));
  }
  
  return c.json({
    success: true,
    count: Math.min(limit, data.length),
    data: data.slice(0, limit),
  });
});

// Get shooting incident data
app.get("/api/shootings", (c) => {
  const limit = parseInt(c.req.query("limit") || "500");
  const date = c.req.query("date");
  
  if (!shootingDataCache) {
    shootingDataCache = loadShootingData(1000);
  }
  
  let data = shootingDataCache;
  if (date) {
    data = data.filter(shooting => matchesDate(shooting.properties.occur_date, date));
  }
  
  return c.json({
    success: true,
    count: Math.min(limit, data.length),
    data: data.slice(0, limit),
  });
});

// Get MTA ridership data
app.get("/api/mta", (c) => {
  const date = c.req.query("date");
  
  if (!mtaDataCache) {
    mtaDataCache = loadMTAData();
  }
  
  let data = mtaDataCache;
  if (date) {
    // MTA dates are in MM/DD/YYYY format
    const [year, month, day] = date.split("-");
    const mtaDate = `${month}/${day}/${year}`;
    data = data.filter(d => d.date === mtaDate);
  }
  
  return c.json({
    success: true,
    count: data.length,
    data: data,
  });
});

// Get current weather
app.get("/api/weather", async (c) => {
  const lat = parseFloat(c.req.query("lat") || "40.7128");
  const lon = parseFloat(c.req.query("lon") || "-74.006");
  const date = c.req.query("date");
  
  // If date is provided and not today, get historical weather
  const today = new Date().toISOString().split("T")[0];
  
  if (date && date !== today && date < today) {
    const weather = await fetchHistoricalWeather(date, lat, lon);
    return c.json({
      success: true,
      data: weather,
      isHistorical: true,
    });
  }
  
  const weather = await fetchWeatherData(lat, lon);
  return c.json({
    success: true,
    data: weather,
    isHistorical: false,
  });
});

// Get historical weather
app.get("/api/weather/historical", async (c) => {
  const date = c.req.query("date") || "2024-12-01";
  const lat = parseFloat(c.req.query("lat") || "40.7128");
  const lon = parseFloat(c.req.query("lon") || "-74.006");
  const weather = await fetchHistoricalWeather(date, lat, lon);
  return c.json({
    success: true,
    data: weather,
  });
});

// Get all data summary
app.get("/api/summary", (c) => {
  const date = c.req.query("date");
  
  if (!bikeDataCache) bikeDataCache = loadBikeData(5000);
  if (!arrestsDataCache) arrestsDataCache = loadArrestsData(1000);
  if (!shootingDataCache) shootingDataCache = loadShootingData(1000);
  if (!mtaDataCache) mtaDataCache = loadMTAData();
  if (!taxiDataCache) taxiDataCache = loadTaxiData(5000);

  let bikeCount = bikeDataCache.length;
  let taxiCount = taxiDataCache.length;
  let arrestsCount = arrestsDataCache.length;
  let shootingsCount = shootingDataCache.length;
  let mtaData = mtaDataCache;
  
  if (date) {
    bikeCount = bikeDataCache.filter(trip => matchesDate(trip.started_at, date)).length;
    taxiCount = taxiDataCache.filter(trip => matchesDate(trip.tpep_pickup_datetime, date)).length;
    arrestsCount = arrestsDataCache.filter(arrest => matchesDate(arrest.properties.arrest_date, date)).length;
    shootingsCount = shootingDataCache.filter(shooting => matchesDate(shooting.properties.occur_date, date)).length;
    
    const [year, month, day] = date.split("-");
    const mtaDate = `${month}/${day}/${year}`;
    mtaData = mtaDataCache.filter(d => d.date === mtaDate);
  }

  return c.json({
    success: true,
    data: {
      bike: { count: bikeCount },
      taxi: { count: taxiCount },
      arrests: { count: arrestsCount },
      shootings: { count: shootingsCount },
      mta: { 
        count: mtaData.length,
        data: mtaData[0] || null
      },
    },
  });
});

// Aggregate data by borough/area
app.get("/api/aggregate", (c) => {
  const date = c.req.query("date");
  
  if (!arrestsDataCache) arrestsDataCache = loadArrestsData(1000);
  if (!shootingDataCache) shootingDataCache = loadShootingData(1000);

  let arrests = arrestsDataCache;
  let shootings = shootingDataCache;
  
  if (date) {
    arrests = arrests.filter(arrest => matchesDate(arrest.properties.arrest_date, date));
    shootings = shootings.filter(shooting => matchesDate(shooting.properties.occur_date, date));
  }

  const boroMap: Record<string, string> = {
    M: "Manhattan",
    K: "Brooklyn",
    Q: "Queens",
    B: "Bronx",
    S: "Staten Island",
  };

  // Aggregate arrests by borough
  const arrestsByBoro: Record<string, number> = {};
  arrests.forEach((arrest) => {
    const boro = boroMap[arrest.properties.arrest_boro] || "Unknown";
    arrestsByBoro[boro] = (arrestsByBoro[boro] || 0) + 1;
  });

  // Aggregate shootings by borough
  const shootingsByBoro: Record<string, number> = {};
  shootings.forEach((shooting) => {
    const boro = shooting.properties.boro || "Unknown";
    shootingsByBoro[boro] = (shootingsByBoro[boro] || 0) + 1;
  });

  // Aggregate arrests by offense
  const arrestsByOffense: Record<string, number> = {};
  arrests.forEach((arrest) => {
    const offense = arrest.properties.ofns_desc || "Unknown";
    arrestsByOffense[offense] = (arrestsByOffense[offense] || 0) + 1;
  });

  return c.json({
    success: true,
    data: {
      arrestsByBoro,
      shootingsByBoro,
      arrestsByOffense,
    },
  });
});

// Get available dates in the dataset
app.get("/api/dates", (c) => {
  if (!bikeDataCache) bikeDataCache = loadBikeData(5000);
  if (!arrestsDataCache) arrestsDataCache = loadArrestsData(1000);
  if (!shootingDataCache) shootingDataCache = loadShootingData(1000);
  if (!mtaDataCache) mtaDataCache = loadMTAData();
  
  const dates = new Set<string>();
  
  bikeDataCache.forEach(trip => {
    const date = parseDate(trip.started_at);
    if (date) dates.add(date);
  });
  
  arrestsDataCache.forEach(arrest => {
    const date = parseDate(arrest.properties.arrest_date);
    if (date) dates.add(date);
  });
  
  shootingDataCache.forEach(shooting => {
    const date = parseDate(shooting.properties.occur_date);
    if (date) dates.add(date);
  });
  
  mtaDataCache.forEach(mta => {
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const parts = mta.date.split("/");
    if (parts.length === 3) {
      const date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      dates.add(date);
    }
  });
  
  const sortedDates = Array.from(dates).sort();
  
  return c.json({
    success: true,
    data: sortedDates,
    min: sortedDates[0],
    max: sortedDates[sortedDates.length - 1],
  });
});

// Serve the main HTML page
app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NYC Data Visualization</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #1a1a2e;
            color: #eee;
        }
        .container {
            display: grid;
            grid-template-columns: 320px 1fr;
            grid-template-rows: auto 1fr;
            height: 100vh;
            gap: 0;
        }
        header {
            grid-column: 1 / -1;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            flex-wrap: wrap;
            gap: 15px;
        }
        header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        .header-controls {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .date-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.1);
            padding: 8px 15px;
            border-radius: 25px;
        }
        .date-selector label {
            font-size: 0.9rem;
            font-weight: 500;
        }
        .date-selector input[type="date"] {
            padding: 6px 10px;
            border: none;
            border-radius: 6px;
            background: rgba(255,255,255,0.2);
            color: #fff;
            font-size: 0.9rem;
            cursor: pointer;
        }
        .date-selector input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            cursor: pointer;
        }
        .date-selector .btn {
            padding: 6px 12px;
            font-size: 0.85rem;
        }
        .date-selector .btn.btn-secondary {
            background: rgba(255,255,255,0.2);
        }
        .date-selector .btn.btn-secondary:hover {
            background: rgba(255,255,255,0.3);
        }
        .weather-widget {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(255,255,255,0.1);
            padding: 8px 15px;
            border-radius: 25px;
        }
        .weather-widget .temp {
            font-size: 1.3rem;
            font-weight: bold;
        }
        .weather-widget .details {
            font-size: 0.85rem;
            opacity: 0.9;
        }
        .weather-widget .historical-badge {
            background: #ff6b6b;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
            margin-left: 5px;
        }
        .sidebar {
            background: #16213e;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .control-group {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 15px;
        }
        .control-group h3 {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #667eea;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .control-group h3 .date-badge {
            font-size: 0.75rem;
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: none;
            letter-spacing: 0;
        }
        .layer-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .layer-toggle:hover {
            opacity: 0.8;
        }
        .layer-toggle input {
            width: 18px;
            height: 18px;
            accent-color: #667eea;
        }
        .layer-toggle .color-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .stat-card {
            background: #0f3460;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card .value {
            font-size: 1.4rem;
            font-weight: bold;
            color: #667eea;
        }
        .stat-card .label {
            font-size: 0.75rem;
            color: #aaa;
            margin-top: 4px;
        }
        .stat-card.full-width {
            grid-column: 1 / -1;
        }
        .mta-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 10px;
        }
        .mta-stat {
            background: #0f3460;
            padding: 8px;
            border-radius: 6px;
            text-align: center;
        }
        .mta-stat .value {
            font-size: 1rem;
            font-weight: bold;
            color: #00ff88;
        }
        .mta-stat .label {
            font-size: 0.65rem;
            color: #aaa;
            margin-top: 2px;
        }
        .chart-container {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 15px;
            height: 200px;
        }
        #map {
            width: 100%;
            height: 100%;
            background: #0f3460;
        }
        .main-content {
            display: flex;
            flex-direction: column;
        }
        .map-container {
            flex: 1;
            position: relative;
        }
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(26, 26, 46, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            font-size: 1.2rem;
        }
        .loading-overlay.hidden {
            display: none;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #667eea;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 15px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .leaflet-popup-content-wrapper {
            background: #16213e;
            color: #eee;
            border-radius: 8px;
        }
        .leaflet-popup-tip {
            background: #16213e;
        }
        .popup-content {
            padding: 5px;
        }
        .popup-content h4 {
            color: #667eea;
            margin-bottom: 8px;
        }
        .popup-content p {
            margin: 4px 0;
            font-size: 0.9rem;
        }
        .popup-content .label {
            color: #aaa;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #667eea;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #5a6fd6;
        }
        .btn:disabled {
            background: #444;
            cursor: not-allowed;
        }
        .legend {
            position: absolute;
            bottom: 30px;
            right: 10px;
            background: rgba(22, 33, 62, 0.95);
            padding: 15px;
            border-radius: 8px;
            z-index: 1000;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 5px 0;
            font-size: 0.85rem;
        }
        .legend-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        .no-data-message {
            text-align: center;
            padding: 20px;
            color: #aaa;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>NYC Urban Data Explorer</h1>
            <div class="header-controls">
                <div class="date-selector">
                    <label for="date-picker">Date:</label>
                    <input type="date" id="date-picker" value="">
                    <button class="btn" id="apply-date">Apply</button>
                    <button class="btn btn-secondary" id="clear-date">All Data</button>
                </div>
                <div class="weather-widget" id="weather-widget">
                    <div class="temp" id="weather-temp">--</div>
                    <div class="details">
                        <div id="weather-desc">Loading...<span id="weather-historical"></span></div>
                        <div id="weather-extra">--</div>
                    </div>
                </div>
            </div>
        </header>
        
        <aside class="sidebar">
            <div class="control-group">
                <h3>
                    Data Layers
                    <span class="date-badge" id="current-date-badge">All Data</span>
                </h3>
                <label class="layer-toggle">
                    <input type="checkbox" id="layer-taxi" checked>
                    <span class="color-dot" style="background: #ffd700;"></span>
                    Taxi Trips
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" id="layer-bike" checked>
                    <span class="color-dot" style="background: #00ff88;"></span>
                    Bike Trips
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" id="layer-arrests">
                    <span class="color-dot" style="background: #ff6b6b;"></span>
                    Arrests
                </label>
                <label class="layer-toggle">
                    <input type="checkbox" id="layer-shootings">
                    <span class="color-dot" style="background: #ff0000;"></span>
                    Shootings
                </label>
            </div>
            
            <div class="control-group">
                <h3>Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="value" id="stat-taxi">-</div>
                        <div class="label">Taxi Trips</div>
                    </div>
                    <div class="stat-card">
                        <div class="value" id="stat-bike">-</div>
                        <div class="label">Bike Trips</div>
                    </div>
                    <div class="stat-card">
                        <div class="value" id="stat-arrests">-</div>
                        <div class="label">Arrests</div>
                    </div>
                    <div class="stat-card">
                        <div class="value" id="stat-shootings">-</div>
                        <div class="label">Shootings</div>
                    </div>
                </div>
            </div>
            
            <div class="control-group">
                <h3>MTA Ridership</h3>
                <div id="mta-single-day" style="display: none;">
                    <div class="mta-stats">
                        <div class="mta-stat">
                            <div class="value" id="mta-subway">-</div>
                            <div class="label">Subway</div>
                        </div>
                        <div class="mta-stat">
                            <div class="value" id="mta-bus">-</div>
                            <div class="label">Bus</div>
                        </div>
                        <div class="mta-stat">
                            <div class="value" id="mta-lirr">-</div>
                            <div class="label">LIRR</div>
                        </div>
                        <div class="mta-stat">
                            <div class="value" id="mta-metro">-</div>
                            <div class="label">Metro-North</div>
                        </div>
                    </div>
                </div>
                <div id="mta-chart-container" class="chart-container">
                    <canvas id="mta-chart"></canvas>
                </div>
            </div>
            
            <div class="control-group">
                <h3>Incidents by Borough</h3>
                <div class="chart-container">
                    <canvas id="boro-chart"></canvas>
                </div>
            </div>
        </aside>
        
        <main class="main-content">
            <div class="map-container">
                <div id="map"></div>
                <div class="loading-overlay" id="loading">
                    <div class="spinner"></div>
                    Loading data...
                </div>
                <div class="legend">
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #ffd700;"></span>
                        Taxi Pickup
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #00ff88;"></span>
                        Bike Station
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #ff6b6b;"></span>
                        Arrest
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #ff0000;"></span>
                        Shooting
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <script>
        // State
        let selectedDate = null;
        let mtaChart = null;
        let boroChart = null;
        let allData = {
            taxi: [],
            bike: [],
            arrests: [],
            shootings: [],
            mta: []
        };
        
        // Initialize map
        const map = L.map('map').setView([40.7128, -74.006], 12);
        
        // Dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
        
        // Layer groups
        const layers = {
            taxi: L.markerClusterGroup({ 
                iconCreateFunction: cluster => L.divIcon({
                    html: '<div style="background:#ffd700;color:#000;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">' + cluster.getChildCount() + '</div>',
                    className: 'custom-cluster',
                    iconSize: [30, 30]
                })
            }),
            bike: L.markerClusterGroup({
                iconCreateFunction: cluster => L.divIcon({
                    html: '<div style="background:#00ff88;color:#000;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">' + cluster.getChildCount() + '</div>',
                    className: 'custom-cluster',
                    iconSize: [30, 30]
                })
            }),
            arrests: L.markerClusterGroup({
                iconCreateFunction: cluster => L.divIcon({
                    html: '<div style="background:#ff6b6b;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">' + cluster.getChildCount() + '</div>',
                    className: 'custom-cluster',
                    iconSize: [30, 30]
                })
            }),
            shootings: L.markerClusterGroup({
                iconCreateFunction: cluster => L.divIcon({
                    html: '<div style="background:#ff0000;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">' + cluster.getChildCount() + '</div>',
                    className: 'custom-cluster',
                    iconSize: [30, 30]
                })
            })
        };
        
        // Add layers to map
        layers.taxi.addTo(map);
        layers.bike.addTo(map);
        
        // Custom icons
        function createIcon(color) {
            return L.divIcon({
                html: \`<div style="background:\${color};width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,0.5);"></div>\`,
                className: 'custom-marker',
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            });
        }
        
        // Format number with commas
        function formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }
        
        // Update weather display
        async function updateWeather(date) {
            try {
                var url = date ? '/api/weather?date=' + date : '/api/weather';
                var res = await fetch(url);
                var weather = await res.json();
                
                if (!weather || !weather.data) {
                    console.error('Invalid weather data');
                    return;
                }
                
                var tempEl = document.getElementById('weather-temp');
                var descEl = document.getElementById('weather-desc');
                var historicalBadge = document.getElementById('weather-historical');
                var extraEl = document.getElementById('weather-extra');
                
                if (tempEl) tempEl.textContent = weather.data.temperature + '°C';
                if (descEl) descEl.textContent = weather.data.description;
                
                if (historicalBadge) {
                    if (weather.isHistorical) {
                        historicalBadge.innerHTML = '<span class="historical-badge">HISTORICAL</span>';
                    } else {
                        historicalBadge.innerHTML = '';
                    }
                }
                
                if (extraEl) {
                    if (weather.data.humidity > 0) {
                        extraEl.textContent = 'Wind: ' + weather.data.windSpeed + ' km/h | Humidity: ' + weather.data.humidity + '%';
                    } else {
                        extraEl.textContent = 'Wind: ' + weather.data.windSpeed + ' km/h | Precip: ' + weather.data.precipitation + 'mm';
                    }
                }
            } catch(e) {
                console.error('Error updating weather:', e);
            }
        }
        
        // Clear all markers from layers
        function clearLayers() {
            layers.taxi.clearLayers();
            layers.bike.clearLayers();
            layers.arrests.clearLayers();
            layers.shootings.clearLayers();
        }
        
        // Helper to safely format numbers
        function safeNumber(val, decimals) {
            if (val === null || val === undefined || isNaN(val)) return 'N/A';
            return Number(val).toFixed(decimals);
        }
        
        // Helper to safely get date
        function safeDate(dateStr) {
            if (!dateStr) return 'N/A';
            if (dateStr.indexOf('T') !== -1) return dateStr.split('T')[0];
            return dateStr;
        }
        
        // Add markers to layers
        function populateLayers(data) {
            // Add taxi markers
            if (data.taxi && Array.isArray(data.taxi)) {
                data.taxi.forEach(function(trip) {
                    try {
                        if (!trip.pickup_latitude || !trip.pickup_longitude) return;
                        var marker = L.marker([trip.pickup_latitude, trip.pickup_longitude], {
                            icon: createIcon('#ffd700')
                        });
                        marker.bindPopup(
                            '<div class="popup-content">' +
                            '<h4>Taxi Trip</h4>' +
                            '<p><span class="label">Distance:</span> ' + (trip.trip_distance || 'N/A') + ' mi</p>' +
                            '<p><span class="label">Fare:</span> $' + safeNumber(trip.fare_amount, 2) + '</p>' +
                            '<p><span class="label">Passengers:</span> ' + (trip.passenger_count || 'N/A') + '</p>' +
                            '<p><span class="label">Pickup:</span> ' + (trip.tpep_pickup_datetime || 'N/A') + '</p>' +
                            '</div>'
                        );
                        layers.taxi.addLayer(marker);
                    } catch(e) { console.error('Error adding taxi marker:', e); }
                });
            }
            
            // Add bike markers
            if (data.bike && Array.isArray(data.bike)) {
                data.bike.forEach(function(trip) {
                    try {
                        if (!trip.start_lat || !trip.start_lng) return;
                        var marker = L.marker([trip.start_lat, trip.start_lng], {
                            icon: createIcon('#00ff88')
                        });
                        marker.bindPopup(
                            '<div class="popup-content">' +
                            '<h4>Bike Trip</h4>' +
                            '<p><span class="label">From:</span> ' + (trip.start_station_name || 'N/A') + '</p>' +
                            '<p><span class="label">To:</span> ' + (trip.end_station_name || 'N/A') + '</p>' +
                            '<p><span class="label">Type:</span> ' + (trip.rideable_type || 'N/A') + '</p>' +
                            '<p><span class="label">Started:</span> ' + (trip.started_at || 'N/A') + '</p>' +
                            '</div>'
                        );
                        layers.bike.addLayer(marker);
                    } catch(e) { console.error('Error adding bike marker:', e); }
                });
            }
            
            // Add arrests markers
            if (data.arrests && Array.isArray(data.arrests)) {
                data.arrests.forEach(function(arrest) {
                    try {
                        if (!arrest.coordinates || !arrest.coordinates[0] || !arrest.coordinates[1]) return;
                        var marker = L.marker([arrest.coordinates[1], arrest.coordinates[0]], {
                            icon: createIcon('#ff6b6b')
                        });
                        var props = arrest.properties || {};
                        marker.bindPopup(
                            '<div class="popup-content">' +
                            '<h4>Arrest</h4>' +
                            '<p><span class="label">Offense:</span> ' + (props.ofns_desc || 'N/A') + '</p>' +
                            '<p><span class="label">Description:</span> ' + (props.pd_desc || 'N/A') + '</p>' +
                            '<p><span class="label">Date:</span> ' + safeDate(props.arrest_date) + '</p>' +
                            '<p><span class="label">Precinct:</span> ' + (props.arrest_precinct || 'N/A') + '</p>' +
                            '</div>'
                        );
                        layers.arrests.addLayer(marker);
                    } catch(e) { console.error('Error adding arrest marker:', e); }
                });
            }
            
            // Add shootings markers
            if (data.shootings && Array.isArray(data.shootings)) {
                data.shootings.forEach(function(shooting) {
                    try {
                        if (!shooting.coordinates || !shooting.coordinates[0] || !shooting.coordinates[1]) return;
                        var marker = L.marker([shooting.coordinates[1], shooting.coordinates[0]], {
                            icon: createIcon('#ff0000')
                        });
                        var props = shooting.properties || {};
                        marker.bindPopup(
                            '<div class="popup-content">' +
                            '<h4>Shooting Incident</h4>' +
                            '<p><span class="label">Borough:</span> ' + (props.boro || 'N/A') + '</p>' +
                            '<p><span class="label">Date:</span> ' + safeDate(props.occur_date) + '</p>' +
                            '<p><span class="label">Time:</span> ' + (props.occur_time || 'N/A') + '</p>' +
                            '<p><span class="label">Location:</span> ' + (props.loc_classfctn_desc || 'N/A') + '</p>' +
                            '<p><span class="label">Fatal:</span> ' + (props.statistical_murder_flag ? 'Yes' : 'No') + '</p>' +
                            '</div>'
                        );
                        layers.shootings.addLayer(marker);
                    } catch(e) { console.error('Error adding shooting marker:', e); }
                });
            }
        }
        
        // Update charts
        function updateCharts(mta, aggregate, isSingleDay) {
            try {
                // Update MTA display
                if (isSingleDay && mta && mta.data && mta.data.length > 0) {
                    document.getElementById('mta-chart-container').style.display = 'none';
                    document.getElementById('mta-single-day').style.display = 'block';
                    
                    var mtaData = mta.data[0];
                    document.getElementById('mta-subway').textContent = formatNumber(mtaData.subways_ridership || 0);
                    document.getElementById('mta-bus').textContent = formatNumber(mtaData.buses_ridership || 0);
                    document.getElementById('mta-lirr').textContent = formatNumber(mtaData.lirr_ridership || 0);
                    document.getElementById('mta-metro').textContent = formatNumber(mtaData.metro_north_ridership || 0);
                } else {
                    document.getElementById('mta-chart-container').style.display = 'block';
                    document.getElementById('mta-single-day').style.display = 'none';
                    
                    // Destroy existing chart
                    if (mtaChart) {
                        mtaChart.destroy();
                        mtaChart = null;
                    }
                    
                    var mtaChartData = (mta && mta.data) ? mta.data.slice(-7) : [];
                    var mtaCtx = document.getElementById('mta-chart').getContext('2d');
                    mtaChart = new Chart(mtaCtx, {
                        type: 'line',
                        data: {
                            labels: mtaChartData.map(function(d) { return d.date || ''; }),
                            datasets: [{
                                label: 'Subway Ridership (M)',
                                data: mtaChartData.map(function(d) { return ((d.subways_ridership || 0) / 1000000).toFixed(2); }),
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                tension: 0.4,
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                x: { 
                                    ticks: { color: '#aaa', maxRotation: 45 },
                                    grid: { color: 'rgba(255,255,255,0.1)' }
                                },
                                y: { 
                                    ticks: { color: '#aaa' },
                                    grid: { color: 'rgba(255,255,255,0.1)' }
                                }
                            }
                        }
                    });
                }
                
                // Destroy existing borough chart
                if (boroChart) {
                    boroChart.destroy();
                    boroChart = null;
                }
                
                // Create borough chart
                var arrestsByBoro = (aggregate && aggregate.data && aggregate.data.arrestsByBoro) ? aggregate.data.arrestsByBoro : {};
                var shootingsByBoro = (aggregate && aggregate.data && aggregate.data.shootingsByBoro) ? aggregate.data.shootingsByBoro : {};
                
                var boroCtx = document.getElementById('boro-chart').getContext('2d');
                var allBoros = Object.keys(arrestsByBoro).concat(Object.keys(shootingsByBoro));
                var boroLabels = allBoros.filter(function(b, i) { 
                    return allBoros.indexOf(b) === i && b !== 'Unknown'; 
                });
                
                if (boroLabels.length === 0) {
                    boroLabels = ['No Data'];
                }
                
                boroChart = new Chart(boroCtx, {
                    type: 'bar',
                    data: {
                        labels: boroLabels,
                        datasets: [
                            {
                                label: 'Arrests',
                                data: boroLabels.map(function(b) { return arrestsByBoro[b] || 0; }),
                                backgroundColor: 'rgba(255, 107, 107, 0.7)'
                            },
                            {
                                label: 'Shootings',
                                data: boroLabels.map(function(b) { return shootingsByBoro[b] || 0; }),
                                backgroundColor: 'rgba(255, 0, 0, 0.7)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                labels: { color: '#aaa', boxWidth: 12 }
                            }
                        },
                        scales: {
                            x: { 
                                ticks: { color: '#aaa' },
                                grid: { display: false }
                            },
                            y: { 
                                ticks: { color: '#aaa' },
                                grid: { color: 'rgba(255,255,255,0.1)' }
                            }
                        }
                    }
                });
            } catch(e) {
                console.error('Error updating charts:', e);
            }
        }
        
        // Load data
        async function loadData(date) {
            var loading = document.getElementById('loading');
            loading.classList.remove('hidden');
            
            try {
                var dateParam = date ? ('?date=' + date) : '';
                var dateParamWithLimit = date ? ('?limit=500&date=' + date) : '?limit=500';
                
                // Fetch all data in parallel
                var responses = await Promise.all([
                    fetch('/api/taxi' + dateParamWithLimit),
                    fetch('/api/bike' + dateParamWithLimit),
                    fetch('/api/arrests' + dateParamWithLimit),
                    fetch('/api/shootings' + dateParamWithLimit),
                    fetch('/api/mta' + dateParam),
                    fetch('/api/aggregate' + dateParam)
                ]);
                
                var data = await Promise.all(responses.map(function(r) { return r.json(); }));
                var taxi = data[0];
                var bike = data[1];
                var arrests = data[2];
                var shootings = data[3];
                var mta = data[4];
                var aggregate = data[5];
                
                // Store data
                allData = {
                    taxi: (taxi && taxi.data) ? taxi.data : [],
                    bike: (bike && bike.data) ? bike.data : [],
                    arrests: (arrests && arrests.data) ? arrests.data : [],
                    shootings: (shootings && shootings.data) ? shootings.data : [],
                    mta: (mta && mta.data) ? mta.data : []
                };
                
                // Update stats
                document.getElementById('stat-taxi').textContent = (taxi && taxi.count) ? taxi.count : 0;
                document.getElementById('stat-bike').textContent = (bike && bike.count) ? bike.count : 0;
                document.getElementById('stat-arrests').textContent = (arrests && arrests.count) ? arrests.count : 0;
                document.getElementById('stat-shootings').textContent = (shootings && shootings.count) ? shootings.count : 0;
                
                // Update date badge
                var dateBadge = document.getElementById('current-date-badge');
                if (date) {
                    dateBadge.textContent = date;
                } else {
                    dateBadge.textContent = 'All Data';
                }
                
                // Update weather
                await updateWeather(date);
                
                // Clear and repopulate map layers
                clearLayers();
                populateLayers(allData);
                
                // Update charts
                updateCharts(mta, aggregate, !!date);
                
                loading.classList.add('hidden');
                
            } catch (error) {
                console.error('Error loading data:', error);
                loading.innerHTML = '<div style="color: #ff6b6b;">Error loading data: ' + error.message + '</div>';
            }
        }
        
        // Initialize date picker with available dates
        async function initDatePicker() {
            try {
                var res = await fetch('/api/dates');
                var dates = await res.json();
                
                var datePicker = document.getElementById('date-picker');
                if (dates.min) {
                    datePicker.min = dates.min;
                }
                if (dates.max) {
                    datePicker.max = dates.max;
                    datePicker.value = dates.max;
                }
            } catch (error) {
                console.error('Error loading dates:', error);
            }
        }
        
        // Event listeners
        document.getElementById('apply-date').addEventListener('click', function() {
            var date = document.getElementById('date-picker').value;
            if (date) {
                selectedDate = date;
                loadData(date);
            }
        });
        
        document.getElementById('clear-date').addEventListener('click', function() {
            selectedDate = null;
            document.getElementById('date-picker').value = '';
            loadData();
        });
        
        document.getElementById('date-picker').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                var date = e.target.value;
                if (date) {
                    selectedDate = date;
                    loadData(date);
                }
            }
        });
        
        // Layer toggle handlers
        document.getElementById('layer-taxi').addEventListener('change', function(e) {
            if (e.target.checked) {
                map.addLayer(layers.taxi);
            } else {
                map.removeLayer(layers.taxi);
            }
        });
        
        document.getElementById('layer-bike').addEventListener('change', function(e) {
            if (e.target.checked) {
                map.addLayer(layers.bike);
            } else {
                map.removeLayer(layers.bike);
            }
        });
        
        document.getElementById('layer-arrests').addEventListener('change', function(e) {
            if (e.target.checked) {
                map.addLayer(layers.arrests);
            } else {
                map.removeLayer(layers.arrests);
            }
        });
        
        document.getElementById('layer-shootings').addEventListener('change', function(e) {
            if (e.target.checked) {
                map.addLayer(layers.shootings);
            } else {
                map.removeLayer(layers.shootings);
            }
        });
        
        // Initialize
        initDatePicker();
        loadData();
    </script>
</body>
</html>`);
});

const port = 3000;
console.log(`NYC Data Visualization server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
