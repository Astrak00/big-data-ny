/**
 * NYC Urban Data Explorer - API Routes
 * =====================================
 * Connects to PostgreSQL database for data
 */

import { Hono } from "hono";
import {
  loadBikeData,
  loadArrestsData,
  loadShootingData,
  loadMTAData,
  loadTaxiData,
  getTaxiCount,
  getBikeCount,
  getArrestsCount,
  getShootingsCount,
  getArrestsByBorough,
  getShootingsByBorough,
  getDateRange,
  fetchWeatherData,
  fetchHistoricalWeather,
} from "./data-loader";

// ===========================================
// Create Router
// ===========================================
export function createApiRoutes(): Hono {
  const api = new Hono();

  // -------------------------------------------
  // Taxi Trip Data
  // -------------------------------------------
  api.get("/taxi", async (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const data = await loadTaxiData(limit, startDate, endDate);
      const total = await getTaxiCount(startDate, endDate);

      return c.json({
        success: true,
        count: data.length,
        total: total,
        data: data.map((trip) => ({
          ...trip,
          tpep_pickup_datetime: trip.pickup_datetime,
          tpep_dropoff_datetime: trip.dropoff_datetime,
        })),
      });
    } catch (error) {
      console.error("Error loading taxi data:", error);
      return c.json({ success: false, error: "Failed to load taxi data", data: [] }, 500);
    }
  });

  // -------------------------------------------
  // Bike Trip Data
  // -------------------------------------------
  api.get("/bike", async (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const data = await loadBikeData(limit, startDate, endDate);
      const total = await getBikeCount(startDate, endDate);

      return c.json({
        success: true,
        count: data.length,
        total: total,
        data: data,
      });
    } catch (error) {
      console.error("Error loading bike data:", error);
      return c.json({ success: false, error: "Failed to load bike data", data: [] }, 500);
    }
  });

  // -------------------------------------------
  // Arrests Data
  // -------------------------------------------
  api.get("/arrests", async (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const data = await loadArrestsData(limit, startDate, endDate);
      const total = await getArrestsCount(startDate, endDate);

      return c.json({
        success: true,
        count: data.length,
        total: total,
        data: data,
      });
    } catch (error) {
      console.error("Error loading arrests data:", error);
      return c.json({ success: false, error: "Failed to load arrests data", data: [] }, 500);
    }
  });

  // -------------------------------------------
  // Shooting Incident Data
  // -------------------------------------------
  api.get("/shootings", async (c) => {
    const limit = parseInt(c.req.query("limit") || "500");
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const data = await loadShootingData(limit, startDate, endDate);
      const total = await getShootingsCount(startDate, endDate);

      return c.json({
        success: true,
        count: data.length,
        total: total,
        data: data,
      });
    } catch (error) {
      console.error("Error loading shootings data:", error);
      return c.json({ success: false, error: "Failed to load shootings data", data: [] }, 500);
    }
  });

  // -------------------------------------------
  // MTA Ridership Data
  // -------------------------------------------
  api.get("/mta", async (c) => {
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const data = await loadMTAData(startDate, endDate);

      return c.json({
        success: true,
        count: data.length,
        data: data,
      });
    } catch (error) {
      console.error("Error loading MTA data:", error);
      return c.json({ success: false, error: "Failed to load MTA data", data: [] }, 500);
    }
  });

  // -------------------------------------------
  // Weather Data (real-time, not from DB)
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
  api.get("/aggregate", async (c) => {
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const arrestsByBoro = await getArrestsByBorough(startDate, endDate);
      const shootingsByBoro = await getShootingsByBorough(startDate, endDate);

      return c.json({
        success: true,
        data: {
          arrestsByBoro,
          shootingsByBoro,
        },
      });
    } catch (error) {
      console.error("Error loading aggregate data:", error);
      return c.json({
        success: false,
        error: "Failed to load aggregate data",
        data: { arrestsByBoro: {}, shootingsByBoro: {} },
      }, 500);
    }
  });

  // -------------------------------------------
  // Available Dates
  // -------------------------------------------
  api.get("/dates", async (c) => {
    try {
      const dateRange = await getDateRange();

      return c.json({
        success: true,
        min: dateRange.min,
        max: dateRange.max,
      });
    } catch (error) {
      console.error("Error loading date range:", error);
      return c.json({
        success: false,
        min: "2020-01-01",
        max: new Date().toISOString().split("T")[0],
      });
    }
  });

  // -------------------------------------------
  // Data Summary
  // -------------------------------------------
  api.get("/summary", async (c) => {
    const startDate = c.req.query("startDate") || c.req.query("date");
    const endDate = c.req.query("endDate");

    try {
      const [taxiCount, bikeCount, arrestsCount, shootingsCount, mtaData] =
        await Promise.all([
          getTaxiCount(startDate, endDate),
          getBikeCount(startDate, endDate),
          getArrestsCount(startDate, endDate),
          getShootingsCount(startDate, endDate),
          loadMTAData(startDate, endDate),
        ]);

      return c.json({
        success: true,
        data: {
          taxi: { count: taxiCount },
          bike: { count: bikeCount },
          arrests: { count: arrestsCount },
          shootings: { count: shootingsCount },
          mta: {
            count: mtaData.length,
            data: mtaData[0] || null,
          },
        },
      });
    } catch (error) {
      console.error("Error loading summary:", error);
      return c.json({
        success: false,
        error: "Failed to load summary",
        data: {
          taxi: { count: 0 },
          bike: { count: 0 },
          arrests: { count: 0 },
          shootings: { count: 0 },
          mta: { count: 0, data: null },
        },
      }, 500);
    }
  });

  // -------------------------------------------
  // Health Check
  // -------------------------------------------
  api.get("/health", async (c) => {
    try {
      // Quick database check
      await getTaxiCount();
      return c.json({ status: "healthy", database: "connected" });
    } catch (error) {
      return c.json({ status: "unhealthy", database: "disconnected" }, 500);
    }
  });

  return api;
}
