// NYC Urban Data - Architecture Diagrams
// =======================================
// Typst diagrams for the data integration project

#import "@preview/fletcher:0.5.7" as fletcher: diagram, edge, node

// Color definitions (matching the UC3M report style)
#let azuluc3m = rgb("#000e78")
#let color-sources = rgb("#cce0ff") // Blue - Data sources
#let color-ingest = rgb("#ffe6cc") // Orange - Ingestion
#let color-raw = rgb("#e6d9f2") // Purple - Raw storage
#let color-spark = rgb("#d9f2e6") // Teal - Processing
#let color-curated = rgb("#d9f2d9") // Green - Curated storage
#let color-analysis = rgb("#f2d9d9") // Red - Analysis
#let color-backend = rgb("#d9f2f2") // Cyan - Backend
#let color-frontend = rgb("#f2f2d9") // Yellow - Frontend
#let color-results = rgb("#e6e6e6") // Gray - Results

// =============================================
// Diagram 1: ETL Extraction Pipeline
// =============================================

#let etl-pipeline-diagram = {
  set text(size: 9pt)
  align(
    center,
    figure(
      diagram(
        spacing: (35pt, 45pt),
        node-stroke: 0.8pt + luma(60%),
        edge-stroke: 0.8pt + luma(40%),
        node-inset: 8pt,

        // Row 1: Data Sources
        node(
          (0, 0),
          [*Fuentes de Datos*],
          fill: color-sources,
          width: 8em,
          height: 3em,
          corner-radius: 4pt,
        ),

        node(
          (1, -0.7),
          align(center)[Parquet\ #text(size: 7pt)[(Taxi)]],
          fill: white,
          width: 6.5em,
          height: 2.5em,
          corner-radius: 3pt,
          stroke: 0.6pt,
        ),
        node(
          (1, 0),
          align(center)[CSV\ #text(size: 7pt)[(Bike, MTA)]],
          fill: white,
          width: 6.5em,
          height: 2.5em,
          corner-radius: 3pt,
          stroke: 0.6pt,
        ),
        node(
          (1, 0.7),
          align(center)[GeoJSON\ #text(size: 7pt)[(Crime)]],
          fill: white,
          width: 6.5em,
          height: 2.5em,
          corner-radius: 3pt,
          stroke: 0.6pt,
        ),

        // Row 2: Extract
        node(
          (0, 1.5),
          [*Extract*],
          fill: color-ingest,
          width: 8em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 1.5),
          align(center)[Rust ETL\ #text(size: 7pt)[extractors.rs]],
          fill: white,
          width: 6.5em,
          height: 2.5em,
          corner-radius: 3pt,
          stroke: 0.6pt,
        ),

        // Row 3: Transform
        node(
          (0, 3),
          [*Transform*],
          fill: color-spark,
          width: 8em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 3),
          align(center)[Rust ETL\ #text(size: 7pt)[transformers.rs]],
          fill: white,
          width: 6.5em,
          height: 2.5em,
          corner-radius: 3pt,
          stroke: 0.6pt,
        ),

        // Transformation details
        node(
          (2, 2.5),
          text(size: 7pt)[Normalización],
          fill: luma(95%),
          width: 7em,
          height: 1.8em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (2, 3),
          text(size: 7pt)[Validación],
          fill: luma(95%),
          width: 7em,
          height: 1.8em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (2, 3.5),
          text(size: 7pt)[Geo-parsing],
          fill: luma(95%),
          width: 7em,
          height: 1.8em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),

        // Row 4: Load
        node(
          (0, 4.5),
          [*Load*],
          fill: color-curated,
          width: 8em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 4.5),
          align(center)[Rust ETL\ #text(size: 7pt)[loaders/\*.rs]],
          fill: white,
          width: 6.5em,
          height: 2.5em,
          corner-radius: 3pt,
          stroke: 0.6pt,
        ),

        // Row 5: Database
        node(
          (0, 6),
          [*PostgreSQL*\ #text(size: 7pt)[+ PostGIS]],
          fill: color-raw,
          width: 8em,
          height: 3em,
          corner-radius: 4pt,
        ),

        // Tables
        node(
          (1, 5.5),
          text(size: 7pt)[taxi_trips],
          fill: luma(95%),
          width: 5.5em,
          height: 1.6em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (1, 6),
          text(size: 7pt)[bike_trips],
          fill: luma(95%),
          width: 5.5em,
          height: 1.6em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (1, 6.5),
          text(size: 7pt)[arrests],
          fill: luma(95%),
          width: 5.5em,
          height: 1.6em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (1, 7),
          text(size: 7pt)[shootings],
          fill: luma(95%),
          width: 5.5em,
          height: 1.6em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),

        // Edges - Main flow
        edge((0, 0), (0, 1.5), "->"),
        edge((0, 1.5), (0, 3), "->"),
        edge((0, 3), (0, 4.5), "->"),
        edge((0, 4.5), (0, 6), "->"),

        // Edges - Components
        edge((1, -0.7), (1, 1.5), "->", stroke: 0.5pt + luma(60%)),
        edge((1, 0), (1, 1.5), "->", stroke: 0.5pt + luma(60%)),
        edge((1, 0.7), (1, 1.5), "->", stroke: 0.5pt + luma(60%)),
        edge((1, 1.5), (1, 3), "->", stroke: 0.5pt + luma(60%)),
        edge((1, 3), (1, 4.5), "->", stroke: 0.5pt + luma(60%)),
        edge((1, 4.5), (1, 5.5), "->", stroke: 0.5pt + luma(60%)),

        // Edges - Transform details
        edge((1, 3), (2, 3), "--", stroke: 0.4pt + luma(70%)),
      ),
      caption: "Arquitectura del sistema ETL para la extracción y carga de datos",
    ),
  )
}

// =============================================
// Diagram 2: Full System Architecture
// =============================================

#let system-architecture-diagram = {
  set text(size: 8pt)
  align(
    center,
    figure(
      diagram(
        spacing: (40pt, 40pt),
        node-stroke: 0.8pt + luma(60%),
        edge-stroke: 0.8pt + luma(40%),
        node-inset: 6pt,

        // Layer 1: Data Sources (top)
        node(
          (0, 0),
          [*Fuentes de datos*\ #text(size: 6pt)[APIs REST, DBs]],
          fill: color-sources,
          width: 10em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, -0.3),
          align(center)[Connectors API],
          fill: white,
          width: 9em,
          height: 2em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),
        node(
          (1, 0.3),
          align(center)[DB dumps],
          fill: white,
          width: 9em,
          height: 2em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),

        // Layer 2: Ingestion
        node(
          (0, 1.3),
          [*Ingesta*\ #text(size: 6pt)[collector / queue]],
          fill: color-ingest,
          width: 10em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 1.3),
          align(center)[Kafka\ #text(size: 6pt)[(opcional)]],
          fill: white,
          width: 6em,
          height: 2.2em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),

        // Layer 3: Raw Storage
        node(
          (0, 2.6),
          [*Raw Storage*\ #text(size: 6pt)[HDFS / S3]\ #text(
              size: 5pt,
            )[JSON/CSV/GeoJSON]],
          fill: color-raw,
          width: 10em,
          height: 3.5em,
          corner-radius: 4pt,
        ),

        // Layer 4: Processing
        node(
          (0, 4),
          [*Procesado*\ #text(size: 6pt)[Apache Spark (ETL)]],
          fill: color-spark,
          width: 10em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 3.6),
          align(center)[*Monitorización*\ Grafana],
          fill: white,
          width: 9em,
          height: 3em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),

        // Layer 5: Curated Storage
        node(
          (0, 5.3),
          [*Curated Storage*\ #text(size: 6pt)[Parquet, particionado]],
          fill: color-curated,
          width: 10em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 5.3),
          align(center)[Catálogo /\ Metadatos],
          fill: white,
          width: 6em,
          height: 3em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),

        // Layer 6: Results
        node(
          (0, 6.6),
          [*Resultados*\ #text(size: 6pt)[materialized views]],
          fill: color-results,
          width: 10em,
          height: 3em,
          corner-radius: 4pt,
        ),
        node(
          (1, 6.2),
          align(center)[Postgres /\ ElasticSearch\ #text(
              size: 5pt,
            )[(opcional)]],
          fill: white,
          width: 7em,
          height: 5em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),

        // Layer 7: Backend API
        node(
          (0, 8),
          [*Backend API*\ #text(size: 6pt)[FastAPI / Flask]\ #text(
              size: 5pt,
            )[GraphQL / JSON]],
          fill: color-backend,
          width: 10em,
          height: 3.5em,
          corner-radius: 4pt,
        ),
        node(
          (1, 8),
          align(center)[*Seguridad*\ OAuth2, encriptación],
          fill: white,
          width: 7em,
          height: 5em,
          corner-radius: 3pt,
          stroke: 0.5pt,
        ),

        // Layer 8: Frontend
        node(
          (0, 9.5),
          [*Frontend*\ #text(size: 6pt)[React]\ #text(size: 5pt)[D3 / Leaflet]],
          fill: color-frontend,
          width: 10em,
          height: 3.5em,
          corner-radius: 4pt,
        ),

        // Side: External Analysis
        node(
          (-1.5, 5.8),
          [*Análisis externo*\ #text(size: 6pt)[Spark MLlib / ML]],
          fill: color-analysis,
          width: 8em,
          height: 5em,
          corner-radius: 4pt,
        ),

        // Side: Social Media APIs
        node(
          (-1.5, 4.3),
          [*APIs Redes Sociales*\ #text(size: 6pt)[Twitter, Mastodon]],
          fill: color-sources,
          width: 8em,
          height: 5em,
          corner-radius: 4pt,
        ),

        // Side: Real-time data
        node(
          (2, 6.6),
          [*Datos Tiempo Real*\ #text(size: 6pt)[APIs, Streams]\ #text(
              size: 5pt,
            )[Kafka, REST]],
          fill: color-sources,
          width: 8em,
          height: 5em,
          corner-radius: 4pt,
        ),

        // Main vertical flow
        edge((0, 0), (0, 1.3), "->"),
        edge((0, 1.3), (0, 2.6), "->"),
        edge((0, 2.6), (0, 4), "->"),
        edge((0, 4), (0, 5.3), "->"),
        edge((0, 5.3), (0, 6.6), "->"),
        edge((0, 6.6), (0, 8), "->"),
        edge((0, 8), (0, 9.5), "->"),

        // Component connections
        edge((1.2, -0.3), (0, 0), "->", stroke: 0.5pt),
        edge((1.2, 0.3), (0, 0), "->", stroke: 0.5pt),
        edge((1.2, 1.3), (0, 1.3), "->", stroke: 0.5pt),
        edge((1, 5.3), (0, 5.3), "-->", stroke: 0.4pt + luma(70%)),
        edge((1, 6.2), (0, 6.6), "-->", stroke: 0.4pt + luma(70%)),
        edge((1, 3.6), (0, 4), "-->", stroke: 0.4pt + luma(70%)),
        edge((1, 8), (0, 8), "-->", stroke: 0.4pt + luma(70%)),

        // Analysis flow
        edge((-1.5, 4.3), (-1.5, 5.8), "->", stroke: 0.6pt),
        edge((0, 5.3), (-1.5, 5.8), "->", stroke: 0.6pt),
        edge((-1.5, 5.8), (0, 6.6), "->", stroke: 0.6pt),

        // Real-time flow
        edge((2, 6.6), (0, 6.6), "->", stroke: 0.6pt),
      ),
      caption: "Arquitectura del sistema de integración de datos históricos y en tiempo real",
    ),
  )
}



// =============================================
// Diagram 3: Proof of Concept Architecture
// =============================================

#let poc-architecture-diagram = {
  set text(size: 8pt)
  align(
    center,
    figure(
      diagram(
        spacing: (45pt, 40pt),
        node-stroke: 0.8pt + luma(60%),
        edge-stroke: 0.8pt + luma(40%),
        node-inset: 6pt,

        // Data Sources (left column)
        node(
          (-1.2, 0),
          [*Fuentes*],
          fill: color-sources,
          width: 6em,
          height: 2.5em,
          corner-radius: 4pt,
        ),
        node(
          (-1.2, 0.6),
          text(size: 7pt)[Taxi Parquet],
          fill: white,
          width: 6em,
          height: 2.5em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (-1.2, 1.2),
          text(size: 7pt)[Bike CSV],
          fill: white,
          width: 6em,
          height: 1.8em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (-1.2, 1.8),
          text(size: 7pt)[MTA CSV],
          fill: white,
          width: 6em,
          height: 1.8em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (-1.2, 2.4),
          text(size: 7pt)[Crime GeoJSON],
          fill: white,
          width: 6em,
          height: 2.5em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),

        // ETL Pipeline (center-left)
        node(
          (0, 1.5),
          [*ETL Rust*\ #text(size: 6pt)[nyc-etl]],
          fill: color-ingest,
          width: 7em,
          height: 3em,
          corner-radius: 4pt,
        ),

        // Database (center)
        node(
          (1.2, 1.5),
          [*PostgreSQL*\ #text(size: 6pt)[+ PostGIS]],
          fill: color-raw,
          width: 7em,
          height: 3em,
          corner-radius: 4pt,
        ),

        // Tables
        node(
          (1.2, 3),
          text(size: 6pt)[taxi_trips],
          fill: luma(95%),
          width: 5.5em,
          height: 1.5em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (1.2, 3.5),
          text(size: 6pt)[bike_trips],
          fill: luma(95%),
          width: 5.5em,
          height: 1.5em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (1.2, 4),
          text(size: 6pt)[arrests],
          fill: luma(95%),
          width: 5.5em,
          height: 1.5em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (1.2, 4.5),
          text(size: 6pt)[mta_ridership],
          fill: luma(95%),
          width: 5.5em,
          height: 1.5em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),

        // Backend
        node(
          (2.4, 1.5),
          [*Backend*\ #text(size: 6pt)[Bun + Hono]\ #text(size: 5pt)[REST API]],
          fill: color-backend,
          width: 7em,
          height: 3.5em,
          corner-radius: 4pt,
        ),

        // API Endpoints
        node(
          (2.4, 3.2),
          text(size: 6pt)[/api/taxi],
          fill: luma(95%),
          width: 6em,
          height: 1.4em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (2.4, 3.7),
          text(size: 6pt)[/api/bike],
          fill: luma(95%),
          width: 6em,
          height: 1.4em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (2.4, 4.2),
          text(size: 6pt)[/api/weather],
          fill: luma(95%),
          width: 6em,
          height: 1.4em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),
        node(
          (2.4, 4.7),
          text(size: 6pt)[/api/route],
          fill: luma(95%),
          width: 6em,
          height: 1.4em,
          corner-radius: 2pt,
          stroke: 0.4pt,
        ),

        // Frontend
        node(
          (3.6, 1.5),
          [*Frontend*\ #text(size: 6pt)[Leaflet + JS]\ #text(size: 5pt)[Mapa
              interactivo]],
          fill: color-frontend,
          width: 7.5em,
          height: 3.5em,
          corner-radius: 4pt,
        ),

        // Real-time API (top)
        node(
          (3.6, -0.5),
          [*Open-Meteo*\ #text(size: 6pt)[Weather API]],
          fill: color-sources,
          width: 9em,
          height: 2.5em,
          corner-radius: 4pt,
        ),

        // Docker
        node(
          (1.2, -0.8),
          [*Docker Compose*],
          fill: luma(90%),
          width: 12em,
          height: 2em,
          corner-radius: 4pt,
        ),

        // Main flow
        edge((-1.2, 0.6), (0, 1.5), "->", stroke: 0.5pt),
        edge((-1.2, 1.2), (0, 1.5), "->", stroke: 0.5pt),
        edge((-1.2, 1.8), (0, 1.5), "->", stroke: 0.5pt),
        edge((-1.2, 2.4), (0, 1.5), "->", stroke: 0.5pt),

        edge((0, 1.5), (1.2, 1.5), "->"),
        edge((1.2, 1.5), (2.4, 1.5), "->"),
        edge((2.4, 1.5), (3.6, 1.5), "->"),

        // Real-time connection
        edge((3.6, -0.5), (3.6, 1.5), "->", stroke: 0.6pt),

        // Tables connection
        edge((1.2, 1.5), (1.2, 3), "--", stroke: 0.4pt + luma(70%)),
        edge((2.4, 1.5), (2.4, 3.2), "--", stroke: 0.4pt + luma(70%)),
      ),
      caption: "Arquitectura de la prueba de concepto del sistema de integración de datos",
    ),
  )
}

// =============================================
// Export functions for use in report
// =============================================

#let etl-pipeline = etl-pipeline-diagram
#let system-architecture = system-architecture-diagram
#let poc-architecture = poc-architecture-diagram
