import postgres from "postgres";

const sql = postgres("postgres://nyc_user:nyc_password@localhost:5432/nyc_urban_data");

async function test() {
  // Count records
  const taxiCount = await sql`SELECT COUNT(*) as count FROM taxi_trips`;
  const bikeCount = await sql`SELECT COUNT(*) as count FROM bike_trips`;
  
  console.log("Taxi count:", taxiCount[0].count);
  console.log("Bike count:", bikeCount[0].count);
  
  // Sample taxi
  const taxiSample = await sql`
    SELECT id, pickup_datetime, 
           ST_X(pickup_point) as lng, ST_Y(pickup_point) as lat,
           pickup_location_id
    FROM taxi_trips LIMIT 3
  `;
  console.log("\nTaxi samples:");
  console.log(taxiSample);
  
  // Sample bike
  const bikeSample = await sql`
    SELECT id, started_at, 
           ST_X(start_point) as lng, ST_Y(start_point) as lat
    FROM bike_trips LIMIT 3
  `;
  console.log("\nBike samples:");
  console.log(bikeSample);
  
  // Check taxi zones
  const zoneCount = await sql`SELECT COUNT(*) as count FROM taxi_zones`;
  console.log("\nTaxi zones count:", zoneCount[0].count);
  
  // Check what location_ids are in taxi data
  const locations = await sql`
    SELECT DISTINCT pickup_location_id, dropoff_location_id 
    FROM taxi_trips 
    LIMIT 10
  `;
  console.log("\nSample location IDs in taxi data:");
  console.log(locations);
  
  // Check if those locations exist in taxi_zones
  const existingZones = await sql`
    SELECT location_id FROM taxi_zones ORDER BY location_id LIMIT 20
  `;
  console.log("\nExisting zone IDs:");
  console.log(existingZones.map(z => z.location_id));
  
  await sql.end();
}

test().catch(console.error);
