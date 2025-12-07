#import "uc3mreport.typ": conf

#import "diagrams.typ": etl-pipeline, poc-architecture, system-architecture


#show: conf.with(
  degree: "Master en Ingeniería Informática",
  subject: "Datos Masivos y Encadenados",
  year: (25, 26),
  project: "Práctica Datos Masivos",
  title: "Visualización de transportes públicos y privados en Nueva York",
  group: 1,
  authors: (
    (name: "Eduardo", surname: "Alarcón Navarro", nia: 100472175),
    (name: "Laura", surname: "Belizón Merchán", nia: 100452273),
  ),
  professor: "Israel González Carrasco",
  toc: true,
  logo: "new",
  language: "es",
  appendixes: include "appendix.typ",
  summary: [
    Este proyecto desarrolla un sistema de datos integrado para analizar los
    patrones de movilidad y la seguridad pública en la ciudad de Nueva York,
    combinando información histórica y en tiempo real procedente de múltiples
    fuentes relacionadas con el transporte y la delincuencia. El objetivo es
    identificar correlaciones entre la movilidad, los acontecimientos urbanos,
    el clima y la violencia, y apoyar la toma de decisiones informadas en
    materia de planificación urbana y recomendaciones de rutas más seguras y
    eficientes.

    El sistema integra una amplia gama de conjuntos de datos, que incluyen
    viajes en taxi, uso de Citi Bike, número de pasajeros de la MTA, incidentes
    delictivos históricos, condiciones meteorológicas, señales de eventos en las
    redes sociales e información sobre el tráfico. Los datos históricos
    (2020-2025) se gestionan a través de una arquitectura materializada basada
    en Apache Cassandra, Apache Spark, Parquet y Kafka para soportar cargas de
    trabajo analíticas y de almacenamiento escalables. Las entradas en tiempo
    real, como las actualizaciones meteorológicas, las condiciones del tráfico y
    la actividad en las redes sociales, se incorporan a través de una capa de
    integración virtual que utiliza API (OpenWeatherMap, Google Maps,
    Twitter/Bluesky/Mastodon).

    Una canalización ETL basada en Rust se encarga de la extracción,
    normalización y carga de conjuntos de datos heterogéneos, mientras que
    Python da soporte a las tareas analíticas y la visualización. La interfaz
    del sistema ofrece visualizaciones geoespaciales interactivas a través de
    Leaflet, con el apoyo adicional de Tableau/ArcGIS para usuarios sin
    conocimientos técnicos.

    Una prueba de concepto, que utiliza datos de diciembre de 2024, valida la
    arquitectura. Demuestra la capacidad de ingestar conjuntos de datos
    multimodales, procesarlos utilizando PostgreSQL + PostGIS y mostrar las
    correlaciones entre movilidad y seguridad en una interfaz web interactiva.
    El enriquecimiento meteorológico en tiempo real (Open-Meteo) confirma la
    capacidad de la plataforma para integrar variables dinámicas.

    El proyecto concluye que la arquitectura híbrida es flexible, escalable y
    eficaz para el análisis de la movilidad y la seguridad. Si bien algunas
    funcionalidades avanzadas, como la integración completa de las redes
    sociales en tiempo real y un motor de navegación inteligente, siguen siendo
    tareas pendientes, la implementación actual establece una base sólida para
    una mayor expansión y para apoyar estrategias de planificación urbana
    basadas en datos.

    #v(1fr)

    *Palabras clave:*

  ],
)


= Análisis y diseño del problema de integración propuesto

La movilidad en las ciudades es un aspecto crucial para el bienestar de sus
habitantes y el desarrollo económico. En este proyecto, nos centramos en la
visualización de datos relacionados con los transportes públicos y privados en
Nueva York y su posible relación con otros factores urbanos, como puede ser la
violencia, para identificar patrones y tendencias que puedan ayudar a mejorar la
planificación urbana y la seguridad.

Para poder llevar a cabo este análisis, hemos recopilado datos de diversas
fuentes, incluyendo conjuntos de datos abiertos proporcionados por el gobierno
de Nueva York y otras organizaciones. Estos datos incluyen información sobre el
uso de bicicletas públicas (Citi Bike), datos de taxis amarillos, así como
estadísticas de uso de transporte público, autobuses y metro, y datos sobre
incidentes de violencia en la ciudad, tiempo en la ciudad y tráfico.


Con estos datos, creemos que se puede obtener información sobre la violencia en
distitas áreas de la ciudad y su posible relación con el uso del transporte
público y privado, así como un sistema de recomendación alternativo para elegir
el método de transporte ópimo dependiendo de la situación, teniendo en cuenta el
tráfico, los eventos que puedan ocurrir en la ciudad, y el histórico de
ocupación de los distintos métodos de transporte. Por ejemplo, podríamos
analizar si hay una mayor incidencia de crímenes en áreas con alta densidad de
estaciones de bicicletas públicas o si ciertas rutas de taxis están asociadas
con mayores tasas de violencia. También nos gustartía poder incluir datos sobre
la meteorología, para comprobar si el uso de transportes varía en función de las
condiciones climáticas. No podemos olvidar que la ciudad de Nueva York es tanto
un destino turístico muy popular, por lo que también nos gustaría analizar cómo
la temporada turística afecta al uso del transporte y a la incidencia de
crímenes como una ciudad con un número extremadamente elevado de eventos,
convenciones y conciertos, que pueden afectar significativamente a la movilidad
y la seguridad en la ciudad.

De esta manera, nos es posible, mediante técnicas de visualización de datos,
identificar áreas problemáticas y proponer soluciones para mejorar la movilidad
y la seguridad en Nueva York. Además, este análisis puede servir como base para
el desarrollo de políticas públicas y estrategias de planificación urbana más
efectivas. También servirá para pedir la planificación de una ruta, de un punto
de origen a un destino, teniendo en cuenta la seguridad y la eficiencia del
transporte, y los eventos que estén ocurriendo en la ciudad en el momento de la
solicitud.

== Fuentes de datos utilizadas
Para llevar a cabo este proyecto, hemos utilizado diversas fuentes de datos
abiertos y públicos relacionados con el transporte y la violencia en Nueva York.
A continuación, se detallan las principales fuentes de datos utilizadas:

#figure(
  table(
    columns: (auto, auto, auto, auto),
    [*Clave*], [*Fuente*], [*Enlace*], [*Año*],
    [taxi_trips],
    [TLC Trip Record Data],
    [https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page],
    [2025],

    [mta_daily],
    [MTA Daily Ridership Data: 2020 - 2025],
    [https://data.ny.gov/Transportation/MTA-Daily-Ridership-Data-2020-2025/vxuj-8kew/about_data],
    [2025],

    [mta_bus_hourly],
    [MTA Bus Hourly Ridership: 2020-2024],
    [https://data.ny.gov/Transportation/MTA-Bus-Hourly-Ridership-2020-2024/kv7t-n8in/about_data],
    [2024],

    [nyc_crime],
    [NYC Citywide Crime Statistics],
    [https://www.nyc.gov/site/nypd/stats/crime-statistics/citywide-crime-stats.page],
    [2025],

    [nyc_shooting_crime],
    [NYPD Shooting Incident Data (Historic)],
    [https://data.cityofnewyork.us/Public-Safety/NYPD-Shooting-Incident-Data-Historic-/833y-fsy8/about_data],
    [2025],

    [nyc_city_bike],
    [Citi Bike Trip Histories],
    [https://citibikenyc.com/system-data],
    [2025],
  ),
  caption: "Fuente de datos históricos, incluyendo su fecha de actualización.",
)
<tab:historic-data-source>

La periodicidad de los datos depende de cada fuente, pero para realizar este
estudio, hemos comprobado que todas las distintas fuentes tienen datos desde
2020 hasta Octubre de 2025, lo que nos permite realizar un análisis coherente y
completo. La granularidad de los datos varía según la fuente, pero en general,
los datos están disponibles a nivel de día o de evento, el cual tiene una marca
temporal precisa.

Pero también tenemos los datos en tiempo real, que obtenemos a través de APIs,
como la API del tiempo de OpenWeatherMap para obtener datos meteorológicos, o
las APIs de redes sociales como Twitter, Bluesky o Mastodon, para obtener datos
sobre eventos en tiempo real que puedan afectar a la movilidad y seguridad en la
ciudad. Estas APIs nos permiten obtener datos actualizados de forma continua, lo
que es crucial para el análisis en tiempo real y la toma de decisiones
informadas. También hemos considerado la API de Google Maps para obtener datos
de tráfico y condiciones de las carreteras en tiempo real, lo que puede ser útil
para analizar cómo el tráfico afecta al uso del transporte y a la seguridad en
la ciudad. A continuación, se detallan las principales fuentes de datos en
tiempo real utilizadas:

#figure(
  table(
    columns: (auto, auto, auto, auto),
    [*Clave*], [*Fuente*], [*Enlace*], [*Frecuencia*],
    [openweathermap],
    [OpenWeatherMap API],
    [https://openweathermap.org/api],
    [Cada hora],

    [twitter_api],
    [Twitter API],
    [https://developer.twitter.com/en/docs/twitter-api],
    [En tiempo real / Por solicitud],

    [bluesky_api],
    [Bluesky API],
    [https://docs.bsky.app/docs/get-started],
    [En tiempo real / Por solicitud],

    [mastodon_api],
    [Mastodon API],
    [https://docs.joinmastodon.org/client/intro/],
    [En tiempo real / Por solicitud],

    [google_maps_api],
    [Google Maps API],
    [https://developers.google.com/maps/documentation],
    [En tiempo real / Por solicitud],
  ),
  caption: "Fuente de información de datos en tiempo real",
)

== Software para la recopilación de datos
Para la recopilación y procesamiento de los datos que no son en tiempo real,
hemos utilizado `Rust` como lenguaje de programación principal para obtener los
datos de las distintas fuentes, ya que ofrece un buen rendimiento y una gestión
eficiente de la memoria. A pesar de estas ventajas, ya que los datos históricos
se van a obtener una vez al mes, no es necesario que la velocidad de análisis
sea alta.

Además, hemos utilizado Python para tareas de análisis de datos y visualización,
ya que cuenta con una amplia gama de bibliotecas especializadas en este ámbito,
como `Pandas`, `Matplotlib` y `Seaborn`. En conctreto, hemos utilizado la
librería `Leaflet` para la visualización de datos geoespaciales, que nos ha
permitido crear mapas interactivos y detallados de Nueva York, mostrando la
distribución de los transportes y los incidentes de violencia en la ciudad.

#etl-pipeline
<fig:etl-pipeline>

== Arquitectura del sistema
Para nuestro proyecto, hemos optado por una arquitectura híbrida, que combina de
una arquitectura materializada y una arquitectura virtual. Esta elección se basa
en la necesidad de manejar grandes volúmenes de datos históricos, así como en la
capacidad de integrar datos en tiempo real para un análisis más dinámico.

=== Arquitectura materializada
La parte materializada de nuestra arquitectura se centra en el almacenamiento y
procesamiento de los datos históricos recopilados de las diversas fuentes.
Concretamente, los datos de taxis, bicicletas públicas, estadísticas de crimen y
el uso del transporte público se almacenan en una base de datos relacional
optimizada para consultas analíticas. Esta base de datos permite realizar
consultas complejas y análisis detallados de los patrones de movilidad y
violencia en Nueva York a lo largo del tiempo.

Para la implementación de esta arquitectura materializada, hemos optado por
utilizar una base de datos distribuida que permita escalar horizontalmente y
manejar grandes volúmenes de datos. Específicamente, hemos elegido `Apache
Cassandra` como sistema de almacenamiento principal, debido a su capacidad para
distribuir datos across múltiples nodos, su alta disponibilidad y su rendimiento
optimizado para escrituras de alto volumen, características críticas para
procesar datos de taxis, bicicletas y transporte público de manera continua.

La arquitectura distribuida se complementa con `Apache Spark` para el
procesamiento paralelo de datos históricos, permitiendo ejecutar análisis
complejos sobre grandes datasets de forma eficiente. Los datos procesados se
almacenan en `Parquet` para optimizar el almacenamiento y las consultas
posteriores. Adicionalmente, utilizamos `Apache Kafka` como sistema de
coordinación entre componentes, facilitando la ingestión de datos desde
múltiples fuentes y su distribución hacia los diferentes módulos de análisis.

Esta arquitectura distribuida nos permite no solo manejar los volúmenes masivos
de datos históricos, sino también preparar el sistema para futuras escalas de
crecimiento y la incorporación de nuevas fuentes de datos sin comprometer el
rendimiento.

=== Arquitectura virtual
La parte virtual de nuestra arquitectura se enfoca en la integración de datos en
tiempo real. Utilizamos APIs para obtener datos actualizados sobre el tiempo en
la ciudad, y en un futuro, planeamos incorporar datos de tráfico y alertas de
seguridad, así como datos sobre redes sociales.

Esta combinación de arquitecturas nos permite aprovechar al máximo los datos
históricos para el análisis profundo, mientras que la integración de datos en
tiempo real nos proporciona una visión actualizada y dinámica de la movilidad y
la seguridad en Nueva York. Esta arquitectura híbrida es flexible y escalable,
permitiéndonos adaptarnos a futuras necesidades y la incorporación de nuevas
fuentes de datos conforme el proyecto evoluciona. No nos es necesario almacenar
los datos en tiempo real de forma persistente, ya que su valor radica en su
inmediatez y actualidad.

== Diseño del sistema de integración de datos
A continuación, se presenta un diagrama que ilustra la arquitectura del sistema
propuesto para la integración de datos históricos y en tiempo real:

#system-architecture
<fig:arquitecture-full-system>

#figure(
  image("diagrama_datos.pdf", width: 100%),
  caption: "Arquitectura del sistema para datos históricos y en tiempo real",
)

== Consultas básicas
Para ilustrar el funcionamiento del sistema de integración de datos, a
continuación se presentan algunas consultas básicas que se pueden realizar sobre
los datos integrados:

- Obtener la cantidad de viajes en taxi por día en un período específico,
  desglosado por tipo de taxi (amarillo, verde, etc.).
- Analizar la correlación entre el uso de bicicletas públicas y la incidencia de
  crímenes en diferentes áreas de la ciudad.
- Visualizar la distribución geográfica de incidentes de violencia en relación
  con las estaciones de transporte público.
- Obtener la ruta óptima entre dos puntos en la ciudad, considerando el tráfico
  y los eventos actuales.
- Analizar patrones de movilidad en función de las condiciones meteorológicas
  (por ejemplo, comparar el uso de transporte en días soleados vs. días
  lluviosos o de calor extremo).
- Consultas la línea que se prevee más congestionada en el metro o autobús en un
  día específico, basándose en datos históricos y eventos actuales, así como la
  previsión meteorológica.

Estas consultas permiten extraer información valiosa de los datos integrados,
facilitando el análisis de la movilidad y la seguridad en Nueva York, y apoyando
la toma de decisiones informadas para mejorar la planificación urbana.

== Visualización de los datos
Para la visualización de los datos integrados, se ha optado por las herramientas
de visualización de datos en Python, como `Matplotlib`, `Seaborn` y `Plotly`,
que permiten crear gráficos interactivos y detallados para una versión simple.

Pero ya que esta herramienta está pensada para que pueda ser utilizada por
usuarios no técnicos, se ha optado por utilizar una página web interactiva para
que, tanto la población general como los responsables de la planificación
urbana, puedan acceder a los datos y visualizaciones de manera sencilla. Para
ello, se ha considerado que las mejores opciones son arcGis o Tableau, que
ofrecen potentes capacidades de visualización geoespacial y `Dygraphs` para la
generación de gráficas interactivas. Estas herramientas facilitan la exploración
de los datos y la identificación de patrones y tendencias en la movilidad y la
seguridad en Nueva York.

Para realizar el procesado de los datos, se utiliza tanto Python como Rust, ya
que ambos lenguajes ofrecen potentes bibliotecas y herramientas para el análisis
y la visualización de datos. Python es especialmente útil para tareas de
análisis de datos y creación de visualizaciones, mientras que Rust se utiliza
para la recopilación y procesamiento eficiente de grandes volúmenes de datos.


= Prueba de Concepto

Para la realización de la prueba de concepto, hemos utilizado un segmento de los
datos, para comprobar la viabilidad de las técnicas de visualización y análisis
propuestas. Hemos seleccionado datos de taxis amarillos, uso de transporte
público, uso de bicicletas de alquiler así como datos de incidentes de violencia
en la ciudad, para un período de 1 mese, concretamente diciembre de 2024. Este
período nos permite observar patrones y tendencias en el uso del transporte y su
posible relación con la violencia en la ciudad en un mes muy activo, ya que se
celebran las navidades, atrayendo a muchos turistas y transportes adicionales.
Con respecto a los datos de redes sociales, no hemos podido tener acceso a
suficiente volumen de datos para este período, por lo que no se han incluido en
la prueba de concepto.
#footnote(
  ["Ver el @apx:real-time-social-media-integration para más detalles sobre la
    integración de datos en tiempo real."],
)

== Implementación Técnica de la POC

Para validar la arquitectura propuesta, se ha desarrollado una implementación
funcional completa que abarca desde la ingesta de datos hasta su visualización
en una interfaz web.

=== Pipeline ETL (Extract, Transform, Load)
Se ha implementado un pipeline de datos robusto utilizando el lenguaje de
programación `Rust`, elegido por su eficiencia y seguridad de memoria. Este
sistema es capaz de:
- *Extraer*: Descargar y leer datos de múltiples fuentes y formatos, incluyendo
  archivos Parquet (viajes de taxi), CSV (bicicletas y transporte público) y
  GeoJSON (incidentes de seguridad).
- *Transformar*: Normalizar los datos, gestionar tipos de datos geoespaciales y
  filtrar registros inválidos.
- *Cargar*: Insertar los datos procesados en una base de datos relacional
  optimizada.

=== Almacenamiento de Datos
Como repositorio central para la POC, se ha desplegado una base de datos
`PostgreSQL` equipada con la extensión `PostGIS`. Esto permite realizar
consultas espaciales avanzadas, fundamentales para relacionar ubicaciones de
transporte con zonas de incidentes. El esquema de base de datos incluye tablas
específicas para:
- `taxi_trips`: Viajes de taxi con puntos de recogida y destino.
- `bike_trips`: Viajes de Citi Bike con información de estaciones.
- `arrests` y `shootings`: Datos de seguridad geolocalizados.
- `mta_ridership`: Datos agregados de uso de transporte público.

=== Visualización y API
La capa de presentación se ha construido sobre una arquitectura moderna y
ligera:
- *Backend*: Un servidor web desarrollado con `Bun` y el framework `Hono`, que
  expone una API REST para servir los datos procesados al frontend de manera
  eficiente.
- *Frontend*: Una interfaz interactiva basada en `Leaflet`, que permite
  visualizar los datos sobre un mapa de la ciudad, facilitando la exploración de
  patrones espaciales.
- *Integración en Tiempo Real*: Se ha integrado la API de `Open-Meteo` para
  enriquecer la visualización con datos meteorológicos actuales e históricos,
  permitiendo correlacionar el clima con los patrones de movilidad.

#poc-architecture
<fig:poc-architecture>


= Conclusiones

En este proyecto, hemos desarrollado una arquitectura híbrida para la
integración y visualización de datos históricos y en tiempo real relacionados
con los transportes públicos y privados en Nueva York, así como su posible
relación con la violencia en la ciudad. La combinación de una arquitectura
materializada para el almacenamiento y procesamiento de datos históricos, junto
con una arquitectura virtual para la integración de datos en tiempo real, nos ha
permitido crear un sistema flexible y escalable que puede adaptarse a futuras
necesidades y la incorporación de nuevas fuentes de datos.

Queremos recalcar que dadas las limitaciones de recursos, no hemos podido
implementar todas las funcionalidades propuestas inicialmente, como la
integración completa de datos en tiempo real o la implementación de un sistema
de navegación avanzado basado en resultados de análisis de redes sociales. Sin
embargo, la prueba de concepto desarrollada demuestra la viabilidad de la
arquitectura propuesta y sienta las bases para futuras mejoras y expansiones del
sistema.



#pagebreak()

#bibliography("references.bib")
