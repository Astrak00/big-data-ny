# Práctica obligatoria de Datos Masivos y Encadenados

# Integración de datos y funcional

# Curso 202 5 - 2026

# Máster Ingeniería Informática

## 1. Descripción

El objetivo del caso práctico es trabajar en un escenario de integración de datos e
integración funcional en un dominio dado. A modo de ejemplo se propone el dominio
de la **programación de televisión**. Se trata de aprovechar los datos en abierto para
proporcionar servicios y aplicaciones que faciliten el acceso a la programación de las
cadenas de televisión enriqueciendo la información obtenida con fuentes de datos
adicionales, por ejemplo, opiniones de un determinado programa/presentador en redes
sociales, información adicional de una película obtenida en portales especializados,
datos estadísticos de los equipos o deportistas que participan en un evento televisado,
etc

Es posible localizar información relativa a la programación de la televisión en distintas
fuentes. Las cadenas de televisión o grupos de comunicación publican en sus webs la
información relativa a la programación diaria. También existen portales donde se puede
consultar la programación de varias cadenas de televisión. Por ejemplo,
https://www.tvguia.es/ muestra la información de diversos canales tanto nacionales
como autonómicos.

A partir de la información de una determinada emisión se puede tratar de analizar para
determinar el tipo de emisión y localizar información adicional. Por ejemplo, si es una
película se puede consultar en Filmafinity (https://www.filmaffinity.com) o imdb
(https://www.imdb.com/) entre otras. También se pueden buscar opiniones al respecto
en la plataforma X.

Para tomar la decisión de ver un programa de televisión puede influir la información
meteorológica. En caso que haga buen tiempo quizás sea mejor idea grabar el programa
para verlo en otro momento y salir, mientras que si hace mal tiempo puede ser
interesante quedarse en casa y ver una serie. Por ello es interesante integrar la
información meteorológica (por ejemplo https://www.aemet.es/ o https://open-
meteo.com/ ). En caso de que el tiempo sea bueno, se podría integrar información de
cines o espectáculos próximos. Por ejemplo para ello se pueden utilizar datos publicados
por las ciudades, como es el caso del Ayuntamiento de Madrid
(https://datos.madrid.es/portal/site/egob/) que además proporciona una API para el
acceso a la información que incluye información de las actividades culturales para los
100 próximos días


### .

Otras fuentes de datos, a modo de ejemplo, que pueden integrarse para estas
alternativas de ocio son:

```
● Datos del Consorcio de Transportes de Madrid: Datos del consorcio de
transportes de Madrid:
https://www.crtm.es/atencion-al-cliente/area-de-descargas/datos-
abiertos.aspx
● Portales web sobre transporte público y privado que contienen información de
itinerarios, infraestructuras, etc. (Metro de Madrid
https://www.metromadrid.es/).
● Información del Tráfico, muy útil para ver si habrá atasco en nuestro camino al
evento (http://www.dgt.es, http://opendata.esri.es/datasets/incidencias-de-
tr%C3%A1fico-espa%C3%B1a)
● Mapas, planos, e información geográfica (Google Maps, Carto DB,
OpenStreetMap ...).
● Otros.
```
En la asignatura de Datos Masivos y Encadenados se estudian tecnologías que facilitan
la integración de aplicaciones a distintos niveles: datos, funcional o lógico y
presentación. **El objetivo de la práctica de este año consiste en desarrollar un esquema
de integración de datos, diseñando una arquitectura software y hardware e
implementar una prueba de concepto para facilitar el acceso a los datos, y su posterior
análisis y visualización.** Evidentemente, se trata de aplicar los conocimientos que se irán
adquiriendo durante la asignatura, de manera que no será necesario implementar


nuevos métodos o algoritmos para el tratamiento de esta información, sino que será
necesario, únicamente, integrar sistemas ya existentes.
Así, la solución a desarrollar en la práctica deberá integrar información y funcionalidad
de distintas fuentes, almacenándola y proporcionando algún mecanismo de
visualización. El desarrollo será un demostrador que no tiene por qué coincidir con el
diseño propuesto, podría ser un subconjunto (por ejemplo, con menos número de
fuentes de datos o menor funcionalidad a integrar).
A continuación, se proporciona exclusivamente a modo de ejemplo un escenario de
integración, consistente en un servicio de localización de ayudas. El objetivo sería
desarrollar un servicio que ayude a planificar una tarde de ocio. Se podría integrar
información de (1) las webs de información de la programación de televisión, (2) webs
de información de eventos en un determinado lugar (3) mapas que ubiquen los eventos
localizados, (4) mensajes de las redes sociales relacionados con los programas de
televisión o los eventos disponibles (4) posibles aparcamientos próximos a los eventos
(5) estado del tráfico y otros recursos que fueran de utilidad. Como APIs a integrar (1)
acceso a la información del ayuntamiento de Madrid y Aemet (2) Localización
geográfica, etc.

Se pide:

1. Definir el valor añadido que proporciona al usuario el escenario de integración
    (conocimiento que no es posible obtener de las fuentes de datos por separado).
2. Seleccionar, recopilar y analizar las fuentes a integrar comprobando el modelo de
    datos y el formato, el histórico y periodo contemplado, la periodicidad de
    actualización, etc.
3. Diseñar un sistema software que recoja la información de las fuentes seleccionadas
    en el punto anterior (en tiempo real o fuentes off-line) basándose en los conceptos
    de integración vistos en la asignatura.
4. Elegir un sistema de integración de datos (virtual o material) adecuado y de
    procesamiento de la información obtenida. En el caso de optar por un enfoque
    material, la tecnología propuesta para el almacenamiento de la información
    recogida debe ajustarse a un paradigma de arquitectura distribuida. En caso de
    elegir una arquitectura de tipo virtual, deberá justificarse adecuadamente la
    ausencia de la capa de almacenamiento.
5. Diseñar un sistema que basándose en los datos integrados realice los análisis
    requeridos y que además visualice la información utilizando distintos formatos
    (líneas temporales, mapas, gráficos estadísticos, etc.). El análisis de los datos se
    realizará a través de un sistema externo (sea una API, una librería software externa,
    etc.). Este diseño debe basarse en alguno de los paquetes de software estudiados
    en la asignatura.
6. Plantear las consultas básicas que proporcionen la información requerida por el
    usuario. Por ejemplo, en el escenario proporcionado a modo de ejemplo, algunas
    consultan podrían ser (a) cuál es la ruta con menos tráfico para el registro del
    Ayuntamiento de Madrid en el momento de la consulta y (b) mostrar una línea
    temporal con la evolución de las ayudas ofrecidas por los distintos ministerios.
7. Para la visualización pueden utilizarse herramientas como librerías de visualización
    en javascript (protovis, Google API visualization, dygraphs), Gephi (para visualización de grafos, http://gephi.org/), Google Data Studio o software como Tableau entre otras opciones.
8. Implementar una prueba de concepto del sistema diseñado. Esta prueba no tiene
    que incluir toda la propuesta teórica, puede ser una parte. Como requisito para la
    prueba de concepto se deberán integrar al menos **tres** fuentes de datos y desde el
    punto de vista de la integración funcional será necesario integrar al menos **un**
    servicio de terceros, por ejemplo, para analizar el texto de los comentarios de los
    ciudadanos en redes sociales. Tanto la integración de datos como la funcional se
    hará de acuerdo a las tecnologías estudiadas en la asignatura. La funcionalidad de
    esta prueba de concepto deberá validarse con los profesores de la asignatura en la
    sesión establecida en el cronograma de la asignatura.


## 2. Normas generales de la práctica.

La práctica se empezará a desarrollar tan pronto como se tengan conocimientos básicos
de la asignatura. El desarrollo se hará de forma progresiva, para lo cual se dividirá en
distintas fases, acordes con los contenidos aprendidos en las clases. Estas fases van a
permitir un avance gradual de acuerdo con lo enseñado en el curso. El **12 de diciembre
se llevará a cabo la validación por parte de los profesores de la asignatura de los
diseños planteados por los alumnos**. Cualquier duda podrá ser consultada bien durante
los días de prácticas, bien a través de correo electrónico. En este último caso, el profesor
de prácticas intentará resolverla lo antes posible. Durante el curso, si es necesario, se
publicará material adicional que facilite la resolución de estas dudas y que ayude en las
determinadas fases del desarrollo.

## 3. Grupos

La práctica se realizará en grupos de 5. Los alumnos deben ser capaces de argumentar y
defender cualquiera de las decisiones que se hayan tomado en la elaboración del caso
práctico, demostrando así su participación real en la realización del caso práctico
(recordad que hacerle la práctica al compañero no es un ejemplo de compañerismo).
**Los grupos de prácticas deberán estar formados y deberán ser notificados al profesor
de prácticas antes del viernes 19 de septiembre de 202 5.**

## 4. Estructura de la memoria

La memoria para cada fase de la práctica deberá contener los siguientes apartados:
● Portada: Con el título del trabajo y los datos de los miembros del grupo.
● Resumen ejecutivo: Una página con una panorámica del trabajo realizado que
debería describir el objetivo, un párrafo describiendo la solución diseñada,
aspectos clave y conclusiones. Este resumen debe contener todo lo necesario
para familiarizarnos con el contenido de la memoria final.
● Análisis y diseño del problema de integración propuesto: Esta sección describirá
las interfaces empleadas, el objetivo de su integración, es decir, la funcionalidad
que proporcionará, la arquitectura software diseñada. Habrá que identificar los
componentes software que hacen falta, las interfaces que existen entre ellos y
la forma en que se proporcionarán dichas interfaces. Para la arquitectura
hardware basta tener en cuenta las indicaciones mencionadas más arriba.
● Prueba de concepto: Este apartado describirá la prueba de concepto
desarrollada incluyendo instrucciones para la ejecución de la prueba de
concepto en la máquina virtual presentada.
● Conclusiones: Este último apartado destacará los objetivos alcanzados, los
problemas encontrados durante el desarrollo de la práctica y las lecciones
aprendidas.


## 5. Entregas

Se realizará una única entrega. Se espera que cada grupo de prácticas entregue una
memoria que contemple los apartados descritos en la sección anterior y la máquina
virtual en la que se implemente la prueba de concepto de integración realizada o código
fuente según sea el caso.

- **Fecha de validación funcional: 12 de diciembre de 202 5. 10% de la nota final de la**
    **asignatura.**
- **Fecha de entrega del proyecto: 12 de diciembre de 2025**.
- **El valor de esta práctica es del 45 % de la nota final.**

Las entregas se realizarán en aula global a través de una tarea. Solamente uno de los
tres alumnos que forman parte del grupo deberá realizar la entrega online. Cada entrega
deberá consistir en un fichero PDF cuyo nombre debe seguir el siguiente formato:
NIA1_NIA2_NIA3.pdf, donde NIA1, NIA2 y NIA3 los NIAS de los alumnos que forman el
grupo. Además, será necesario ofrecer una implementación de la solución de
integración propuesta, que se entregará mediante una máquina virtual ejecutable en el
entorno Oracle VM VirtualBox. Conviene asegurarse de que esta máquina virtual se
ejecuta sin problema en distintas máquinas.

## 6. Criterios de evaluación

Los aspectos que se tendrán en cuenta a la hora de evaluar el trabajo y su peso son:

```
● El peso de esta práctica en la nota final de la asignatura es de 4.5 puntos, que se
distribuyen de la siguiente forma:
o Complejidad del problema de integración propuesto: 2 puntos. Se
valorará la búsqueda de fuentes a integrar y la creatividad de la solución
propuesta.
o Calidad de la memoria: 1 punto.
o Adecuación de la solución de integración: 1.5 puntos.
```

