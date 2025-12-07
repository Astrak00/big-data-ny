// Test file for diagrams
// Compile with: typst compile diagrams_test_render.typ

#import "diagrams.typ": etl-pipeline, poc-architecture, system-architecture

#set page(width: auto, height: auto, margin: 1cm)
#set text(font: "Liberation Sans", size: 10pt)

= 1. Pipeline ETL (Extracción)
#v(1em)
#etl-pipeline

#pagebreak()

= 2. Arquitectura del Sistema
#v(1em)
#system-architecture

#pagebreak()

= 3. Arquitectura de la Prueba de Concepto
#v(1em)
#poc-architecture

