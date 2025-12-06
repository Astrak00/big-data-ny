/**
 * NYC Urban Data Explorer - Server
 * ==================================
 * 
 * A Bun + Hono server that serves the NYC Urban Data Explorer application.
 * 
 * Run with: bun run dev
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createApiRoutes } from "./routes";

// ===========================================
// Initialize Application
// ===========================================
const app = new Hono();

// Enable CORS for all routes
app.use("/*", cors());

// ===========================================
// API Routes
// ===========================================
const apiRoutes = createApiRoutes();
app.route("/api", apiRoutes);

// ===========================================
// Static Files
// ===========================================

// Serve node_modules files (for chart.js, etc.)
app.get("/node_modules/*", async (c) => {
  const path = c.req.path.replace("/node_modules/", "");
  const file = Bun.file(`./node_modules/${path}`);
  
  if (await file.exists()) {
    const contentType = getContentType(path);
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  }
  
  return c.notFound();
});

// Serve static files from public directory
app.get("/public/*", async (c) => {
  const path = c.req.path.replace("/public/", "");
  const file = Bun.file(`./src/visualization/public/${path}`);
  
  if (await file.exists()) {
    const contentType = getContentType(path);
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  }
  
  return c.notFound();
});

// Serve index.html for root path
app.get("/", async (c) => {
  const file = Bun.file("./src/visualization/public/index.html");
  
  if (await file.exists()) {
    return new Response(file, {
      headers: { "Content-Type": "text/html" },
    });
  }
  
  return c.text("index.html not found", 404);
});

// ===========================================
// Utility Functions
// ===========================================

/**
 * Get content type based on file extension
 */
function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
  };
  
  return contentTypes[ext || ""] || "application/octet-stream";
}

// ===========================================
// Start Server
// ===========================================
const port = 3000;

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   NYC Urban Data Explorer                                 ║
║   ───────────────────────                                 ║
║                                                           ║
║   Server running at: http://localhost:${port}               ║
║                                                           ║
║   API Endpoints:                                          ║
║   • GET /api/taxi      - Taxi trip data                   ║
║   • GET /api/bike      - Bike trip data                   ║
║   • GET /api/arrests   - NYPD arrests data                ║
║   • GET /api/shootings - NYPD shooting incidents          ║
║   • GET /api/mta       - MTA ridership data               ║
║   • GET /api/weather   - Weather data                     ║
║   • GET /api/aggregate - Aggregated statistics            ║
║   • GET /api/dates     - Available date range             ║
║   • GET /api/summary   - Data summary                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
