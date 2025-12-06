/**
 * NYC Urban Data Explorer - API Routes
 * =====================================
 */

import { Hono } from "hono";
import {
  loadBikeData,
  loadArrestsData,
  loadShootingData,
  loadMTAData,
  loadTaxiData,
  fetchWeatherData,
  fetchHistoricalWeather,
} from "./data-loader";

// ===========================================
// Types
// ===========================================
type BikeData = ReturnType<typeof loadBikeData>;
type ArrestsData = ReturnType<typeof loadArrestsData>;
type ShootingData = ReturnType<typeof loadShootingData>;
type MTAData = ReturnType<typeof loadMTAData>;
type TaxiData = ReturnType<typeof loadTaxiData>;

// ===========================================
// Data Cache
// ===========================================
let bikeDataCache: BikeData | null = null;
let arrestsDataCache: ArrestsData | null = null;
let shootingDataCache: ShootingData | null = null;
let mtaDataCache: MTAData | null = null;
let taxiDataCache: TaxiData | null = null;

// ===========================================
// Helper Functions
// ===========================================

/**
 * Parse date from various formats to YYYY-MM-DD
 */
function parseDate(dateStr: string): string {
  if (dateStr.includes("T")) {
    return dateStr.split("T")[0];
  }
  if (dateStr.includes(" ")) {
    return dateStr.split(" ")[0];
  }
  return dateStr;
}

/**
 * Check if a date matches a single date filter
 */
function matchesDate(itemDate: string | undefined, filterDate: string): boolean {
  if (!itemDate || !filterDate) return true;
  const itemDateParsed = parseDate(itemDate);
  return itemDateParsed === filterDate;
}

/**
 * Check if a date falls within a date range
 */
function matchesDateRange(
  itemDate: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
): boolean {
  if (!itemDate) return false;
  const itemDateParsed = parseDate(itemDate);

  if (startDate && endDate) {
    return itemDateParsed >= startDate && itemDateParsed <= endDate;
  } else if (startDate) {
    return itemDateParsed === startDate;
  }
  return true;
}

/**
 * Convert MTA date format (MM/DD/YYYY) to YYYY-MM-DD
 */
function mtaDateToISO(mtaDate: string): string | null {
  const parts = mtaDate.split("/");
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}

// ===========================================
// Create Router
// ===========================================
export function createApiRoutes(): Hono {
  const api = new Hono();

  // -------------------------------------------
  // Bike Trip Data
  // -------------------------------------------
  api.get("/bike", (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    if (!bikeDataCache) {
      bikeDataCache = loadBikeData(5000);
    }

    let data = bikeDataCache;
    if (startDate) {
      data = data.filter((trip) =>
        matchesDateRange(trip.started_at, startDate, endDate)
      );
    }

    return c.json({
      success: true,
      count: Math.min(limit, data.length),
      total: data.length,
      data: data.slice(0, limit),
    });
  });

  // -------------------------------------------
  // Taxi Trip Data
  // -------------------------------------------
  api.get("/taxi", (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    if (!taxiDataCache) {
      taxiDataCache = loadTaxiData(5000);
    }

    let data = taxiDataCache;
    if (startDate) {
      data = data.filter((trip) =>
        matchesDateRange(trip.tpep_pickup_datetime, startDate, endDate)
      );
    }

    return c.json({
      success: true,
      count: Math.min(limit, data.length),
      total: data.length,
      data: data.slice(0, limit),
    });
  });

  // -------------------------------------------
  // Arrests Data
  // -------------------------------------------
  api.get("/arrests", (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    if (!arrestsDataCache) {
      arrestsDataCache = loadArrestsData(1000);
    }

    let data = arrestsDataCache;
    if (startDate) {
      data = data.filter((arrest) =>
        matchesDateRange(arrest.properties.arrest_date, startDate, endDate)
      );
    }

    return c.json({
      success: true,
      count: Math.min(limit, data.length),
      total: data.length,
      data: data.slice(0, limit),
    });
  });

  // -------------------------------------------
  // Shooting Incident Data
  // -------------------------------------------
  api.get("/shootings", (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    if (!shootingDataCache) {
      shootingDataCache = loadShootingData(1000);
    }

    let data = shootingDataCache;
    if (startDate) {
      data = data.filter((shooting) =>
        matchesDateRange(shooting.properties.occur_date, startDate, endDate)
      );
    }

    return c.json({
      success: true,
      count: Math.min(limit, data.length),
      total: data.length,
      data: data.slice(0, limit),
    });
  });

  // -------------------------------------------
  // MTA Ridership Data
  // -------------------------------------------
  api.get("/mta", (c) => {
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    if (!mtaDataCache) {
      mtaDataCache = loadMTAData();
    }

    let data = mtaDataCache;
    if (startDate) {
      data = data.filter((d) => {
        const mtaDateFormatted = mtaDateToISO(d.date);
        if (!mtaDateFormatted) return false;

        if (endDate) {
          return mtaDateFormatted >= startDate && mtaDateFormatted <= endDate;
        }
        return mtaDateFormatted === startDate;
      });
    }

    return c.json({
      success: true,
      count: data.length,
      data: data,
    });
  });

  // -------------------------------------------
  // Weather Data
  // -------------------------------------------
  api.get("/weather", async (c) => {
    const lat = parseFloat(c.req.query("lat") || "40.7128");
    const lon = parseFloat(c.req.query("lon") || "-74.006");
    const date = c.req.query("date");

    const today = new Date().toISOString().split("T")[0];

    // Return historical weather if date is in the past
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

  // -------------------------------------------
  // Historical Weather
  // -------------------------------------------
  api.get("/weather/historical", async (c) => {
    const date = c.req.query("date") || "2024-12-01";
    const lat = parseFloat(c.req.query("lat") || "40.7128");
    const lon = parseFloat(c.req.query("lon") || "-74.006");

    const weather = await fetchHistoricalWeather(date, lat, lon);
    return c.json({
      success: true,
      data: weather,
    });
  });

  // -------------------------------------------
  // Aggregate Data by Borough
  // -------------------------------------------
  api.get("/aggregate", (c) => {
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    if (!arrestsDataCache) arrestsDataCache = loadArrestsData(1000);
    if (!shootingDataCache) shootingDataCache = loadShootingData(1000);

    let arrests = arrestsDataCache;
    let shootings = shootingDataCache;

    if (startDate) {
      arrests = arrests.filter((arrest) =>
        matchesDateRange(arrest.properties.arrest_date, startDate, endDate)
      );
      shootings = shootings.filter((shooting) =>
        matchesDateRange(shooting.properties.occur_date, startDate, endDate)
      );
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

  // -------------------------------------------
  // Available Dates
  // -------------------------------------------
  api.get("/dates", (c) => {
    if (!bikeDataCache) bikeDataCache = loadBikeData(5000);
    if (!arrestsDataCache) arrestsDataCache = loadArrestsData(1000);
    if (!shootingDataCache) shootingDataCache = loadShootingData(1000);
    if (!mtaDataCache) mtaDataCache = loadMTAData();

    const dates = new Set<string>();

    bikeDataCache.forEach((trip) => {
      const date = parseDate(trip.started_at);
      if (date) dates.add(date);
    });

    arrestsDataCache.forEach((arrest) => {
      const date = parseDate(arrest.properties.arrest_date);
      if (date) dates.add(date);
    });

    shootingDataCache.forEach((shooting) => {
      const date = parseDate(shooting.properties.occur_date);
      if (date) dates.add(date);
    });

    mtaDataCache.forEach((mta) => {
      const date = mtaDateToISO(mta.date);
      if (date) dates.add(date);
    });

    const sortedDates = Array.from(dates).sort();

    return c.json({
      success: true,
      data: sortedDates,
      min: sortedDates[0],
      max: sortedDates[sortedDates.length - 1],
    });
  });

  // -------------------------------------------
  // Data Summary
  // -------------------------------------------
  api.get("/summary", (c) => {
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
      bikeCount = bikeDataCache.filter((trip) =>
        matchesDate(trip.started_at, date)
      ).length;
      taxiCount = taxiDataCache.filter((trip) =>
        matchesDate(trip.tpep_pickup_datetime, date)
      ).length;
      arrestsCount = arrestsDataCache.filter((arrest) =>
        matchesDate(arrest.properties.arrest_date, date)
      ).length;
      shootingsCount = shootingDataCache.filter((shooting) =>
        matchesDate(shooting.properties.occur_date, date)
      ).length;

      const [year, month, day] = date.split("-");
      const mtaDate = `${month}/${day}/${year}`;
      mtaData = mtaDataCache.filter((d) => d.date === mtaDate);
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
          data: mtaData[0] || null,
        },
      },
    });
  });

  return api;
}
