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
  fetchWeatherGrid,
  planRoute,
  getTaxiStats,
  getBikeStats,
  findNearbyBikeStations,
  getCrimeAlongRoute,
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
  // Weather Grid for Map Overlay
  // -------------------------------------------
  api.get("/weather/grid", async (c) => {
    const date = c.req.query("date");

    try {
      const grid = await fetchWeatherGrid(date);
      return c.json({
        success: true,
        data: grid,
      });
    } catch (error) {
      console.error("Error fetching weather grid:", error);
      return c.json({
        success: false,
        error: "Failed to fetch weather grid",
        data: { points: [], bounds: {}, date: "", maxPrecipitation: 0 },
      }, 500);
    }
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

  // -------------------------------------------
  // Route Planning
  // -------------------------------------------
  api.get("/route", async (c) => {
    const originLat = parseFloat(c.req.query("originLat") || "");
    const originLng = parseFloat(c.req.query("originLng") || "");
    const destLat = parseFloat(c.req.query("destLat") || "");
    const destLng = parseFloat(c.req.query("destLng") || "");
    const optimizeFor = (c.req.query("optimize") || "fastest") as "fastest" | "cheapest" | "safest";

    // Validate coordinates
    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return c.json({
        success: false,
        error: "Invalid coordinates. Please provide originLat, originLng, destLat, destLng",
      }, 400);
    }

    // Validate coordinates are within NYC area (roughly)
    const nycBounds = {
      north: 40.92,
      south: 40.49,
      east: -73.70,
      west: -74.26,
    };

    if (
      originLat < nycBounds.south || originLat > nycBounds.north ||
      originLng < nycBounds.west || originLng > nycBounds.east ||
      destLat < nycBounds.south || destLat > nycBounds.north ||
      destLng < nycBounds.west || destLng > nycBounds.east
    ) {
      return c.json({
        success: false,
        error: "Coordinates must be within NYC area",
      }, 400);
    }

    try {
      const result = await planRoute(
        { lat: originLat, lng: originLng },
        { lat: destLat, lng: destLng },
        optimizeFor
      );

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error planning route:", error);
      return c.json({
        success: false,
        error: "Failed to plan route",
      }, 500);
    }
  });

  // -------------------------------------------
  // Transport Statistics
  // -------------------------------------------
  api.get("/transport-stats", async (c) => {
    try {
      const [taxiStats, bikeStats] = await Promise.all([
        getTaxiStats(),
        getBikeStats(),
      ]);

      return c.json({
        success: true,
        data: {
          taxi: taxiStats,
          bike: bikeStats,
          metro: {
            flatFare: 2.90,
            avgSpeedMph: 17,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching transport stats:", error);
      return c.json({
        success: false,
        error: "Failed to fetch transport statistics",
      }, 500);
    }
  });

  // -------------------------------------------
  // Nearby Bike Stations
  // -------------------------------------------
  api.get("/bike-stations", async (c) => {
    const lat = parseFloat(c.req.query("lat") || "");
    const lng = parseFloat(c.req.query("lng") || "");
    const radius = parseFloat(c.req.query("radius") || "500");

    if (isNaN(lat) || isNaN(lng)) {
      return c.json({
        success: false,
        error: "Invalid coordinates. Please provide lat and lng",
      }, 400);
    }

    try {
      const stations = await findNearbyBikeStations({ lat, lng }, radius);

      return c.json({
        success: true,
        data: stations,
      });
    } catch (error) {
      console.error("Error finding bike stations:", error);
      return c.json({
        success: false,
        error: "Failed to find nearby bike stations",
      }, 500);
    }
  });

  // -------------------------------------------
  // Crime Density for Route
  // -------------------------------------------
  api.post("/crime-density", async (c) => {
    try {
      const body = await c.req.json();
      const { geometry, buffer = 200 } = body;

      if (!geometry || !Array.isArray(geometry) || geometry.length < 2) {
        return c.json({
          success: false,
          error: "Invalid geometry. Please provide an array of [lng, lat] coordinates",
        }, 400);
      }

      const crimeStats = await getCrimeAlongRoute(geometry, buffer);

      return c.json({
        success: true,
        data: crimeStats,
      });
    } catch (error) {
      console.error("Error calculating crime density:", error);
      return c.json({
        success: false,
        error: "Failed to calculate crime density",
      }, 500);
    }
  });

  return api;
}
