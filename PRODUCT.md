# Documento de producto — RouteEV

**Ruteo inteligente para vehículos eléctricos en Uruguay**

| | |
|---|---|
| **Estado** | BETA funcional — proyecto independiente en desarrollo activo, no desplegado en producción |
| **Versión** | 0.1.0 |
| **Documentos relacionados** | [`TECHNICAL.md`](TECHNICAL.md) (diseño e implementación) · [`DEPLOY.md`](DEPLOY.md) (puesta en producción) · [`README.md`](README.md) (visión general) |

---

## Índice

- [1. Resumen ejecutivo](#1-resumen-ejecutivo)
- [2. El problema](#2-el-problema)
- [3. La propuesta de valor](#3-la-propuesta-de-valor)
- [4. Usuarios objetivo](#4-usuarios-objetivo)
- [5. Alcance funcional](#5-alcance-funcional)
- [6. Recorrido del usuario](#6-recorrido-del-usuario)
- [7. Base de datos del producto](#7-base-de-datos-del-producto)
- [8. Posicionamiento frente a alternativas](#8-posicionamiento-frente-a-alternativas)
- [9. Decisiones de producto](#9-decisiones-de-producto)
- [10. Qué no hace (alcance explícitamente excluido)](#10-qué-no-hace-alcance-explícitamente-excluido)
- [11. Estado actual y madurez](#11-estado-actual-y-madurez)
- [12. Camino a producción](#12-camino-a-producción)
- [13. Evolución posible](#13-evolución-posible)
- [14. Glosario](#14-glosario)

---

## 1. Resumen ejecutivo

RouteEV calcula rutas para vehículos eléctricos sobre el mapa vial real de Uruguay,
verificando tramo a tramo si la batería alcanza y planificando automáticamente las paradas
de carga necesarias.

La diferencia con un navegador convencional no es cosmética. Google Maps o Waze responden
*"cuál es el camino más rápido"*. RouteEV responde una pregunta distinta: *"¿puedo hacer
este viaje con la carga que tengo, y si no, dónde paro?"*. Esa segunda pregunta es la que
efectivamente frena a un conductor de vehículo eléctrico antes de salir a ruta.

El sistema trabaja sobre datos reales y verificables: 63.833 intersecciones de
OpenStreetMap cubriendo los 19 departamentos, las 209 estaciones de la red pública de UTE
Movilidad con sus conectores y potencias oficiales, y un catálogo de 880 modelos de auto
eléctrico con sus especificaciones de fábrica.

Es un producto funcional en estado BETA. Rutea de verdad sobre datos de verdad, pero
todavía no está expuesto a internet.

---

## 2. El problema

### 2.1 La ansiedad de autonomía es un problema de información, no de tecnología

El obstáculo declarado con más frecuencia para adoptar un vehículo eléctrico no es el
precio ni la velocidad de carga: es no saber si se va a llegar. Y esa incertidumbre no
viene de que el auto no pueda hacer el viaje, sino de que **el conductor no tiene cómo
saberlo antes de salir**.

Tres cosas alimentan esa incertidumbre:

1. **La autonomía del folleto no es la autonomía real.** Un fabricante declara un número
   bajo condiciones de laboratorio. El consumo real cambia con la velocidad, la topografía
   y el tráfico. Un auto de "300 km de autonomía" puede hacer bastante menos en ruta.

2. **La infraestructura de carga es dispersa y desigual.** No todas las estaciones tienen
   el mismo conector ni la misma potencia. Una estación de 22 kW y una de 60 kW son
   experiencias distintas: veinte minutos contra una hora y media.

3. **Los mapas convencionales no modelan la batería.** Optimizan tiempo o distancia. Un
   camino diez minutos más rápido pero que deja al auto sin carga a mitad de ruta es, para
   este usuario, una respuesta incorrecta — y el mapa no tiene forma de saberlo.

### 2.2 Por qué Uruguay

El contexto uruguayo hace el problema tratable y a la vez relevante:

- **Escala abarcable.** El país entero cabe en un grafo que corre en una sola máquina, con
  distancias interdepartamentales (400–550 km) que están justo en el límite de la
  autonomía de un vehículo eléctrico típico. Es exactamente el rango donde planificar la
  carga deja de ser opcional.
- **Red de carga pública y documentada.** UTE publica el listado de sus estaciones con
  conectores y potencias. Eso permite construir sobre datos oficiales en vez de
  estimaciones.
- **Mercado con competencia establecida.** Existen productos que ya resuelven este problema
  en Uruguay: **CarGO** (planificación de ruta con paradas de carga, agregando UTE Mueve,
  Evergo, EVE, eOne, Shell Recharge, YPF y otros, en Uruguay, Argentina y Brasil),
  **UTE Mueve** (estado en tiempo real de la red pública) y **eOne** (red de carga
  ultrarrápida con app propia). A nivel internacional, **ABRP** es el planificador de
  referencia y toma sus datos de Open Charge Map. Cualquier estrategia de producto tiene
  que partir de ahí, no de un vacío (ver §8).

> **Nota de honestidad intelectual:** este documento no incluye investigación de usuarios
> ni dimensionamiento de mercado, porque no se realizaron. El problema descrito es una
> caracterización razonada del dominio, no un hallazgo validado con conductores reales.
> Validarlo con usuarios es el primer paso pendiente (ver §13).

---

## 3. La propuesta de valor

> **Poné tu auto, tu carga actual y a dónde vas. RouteEV te dice si llegás, y si no,
> dónde parar.**

Tres promesas concretas:

| Promesa | Cómo se cumple |
|---|---|
| **Te decimos la verdad sobre tu batería** | El cálculo usa el consumo real de *tu* modelo sobre *cada* tramo, no un promedio genérico |
| **No planificás la carga: la planificamos nosotros** | Las paradas surgen del propio algoritmo, como parte de la ruta óptima, no de una lista de estaciones cercanas |
| **Datos reales, no aproximaciones** | Calles reales de OpenStreetMap, estaciones reales de UTE, especificaciones reales de fábrica |

---

## 4. Usuarios objetivo

### 4.1 Usuario primario — el conductor de vehículo eléctrico

Tiene un auto eléctrico y necesita salir de su zona conocida. Dentro de la ciudad no
tiene problema; el viaje al interior es el que lo pone nervioso.

**Lo que necesita:** saber, antes de salir, si el viaje es viable y cuánto va a tardar de
verdad — incluyendo el tiempo parado cargando, que es tiempo de viaje aunque el auto no se
mueva.

**Cómo lo sirve el producto:** el panel de resultado da distancia, tiempo total, batería al
llegar, costo estimado y cada parada de carga con su duración.

### 4.2 Usuario secundario — quien evalúa comprar un eléctrico

Todavía no tiene el auto. Quiere saber si un modelo concreto le sirve para los viajes que
realmente hace.

**Cómo lo sirve el producto:** puede cargar cualquiera de los 880 modelos del catálogo y
simular sus rutas habituales antes de comprar. El catálogo precarga las especificaciones,
así que no necesita conocerlas.

---

## 5. Alcance funcional

### 5.1 Planificación de ruta

- Cálculo sobre el grafo vial real de los 19 departamentos.
- Verificación de batería arista por arista, con el consumo del vehículo seleccionado.
- Inserción automática de paradas de carga cuando la batería no alcanza, eligiendo estación
  y momento como parte de la optimización, no como un paso posterior.
- Detección de tramos con peaje y su costo cuando la tarifa es conocida.
- Resultado con distancia, tiempo, energía consumida, batería restante, costo en pesos
  uruguayos y detalle de cada parada.

### 5.2 Gestión de vehículos

- Catálogo de 880 modelos que precargan capacidad, consumo y potencia de carga.
- Búsqueda con autocompletado nativo del navegador sobre los 880 modelos.
- Búsqueda asistida por IA para identificar modelos fuera del catálogo (opcional; si no
  está configurada, la función simplemente no aparece).
- Carga manual de especificaciones para casos no cubiertos.
- Batería expresada en **porcentaje**, no en kWh: es la unidad que el usuario ve en su
  tablero.

### 5.3 Selección de origen y destino

Tres métodos, para cubrir distintas formas de pensar un viaje:

| Método | Cuándo sirve |
|---|---|
| Click en el mapa | El usuario sabe dónde queda, pero no la dirección |
| Ubicación del dispositivo (GPS) | "Salgo desde acá" |
| Escribir en el campo (autocompletado) | Intersecciones del grafo filtradas al instante, o "18 de Julio 1360" como dirección completa |

### 5.4 Seguimiento del viaje en vivo

Durante el viaje, usando el GPS real del dispositivo: posición sobre la ruta, distancia
recorrida, batería estimada restante y aviso al pasar por cada parada de carga prevista.

Si el usuario se aleja de la ruta calculada, el sistema **lo dice explícitamente** en vez
de mostrar un progreso inventado.

Incluye un asesor de **velocidad recomendada**: compara cuánta batería queda contra cuánta
hace falta al ritmo actual y, si el margen es ajustado, sugiere una velocidad concreta para
llegar sin necesidad de una parada de carga adicional.

### 5.5 Historial y perfil

Historial de viajes **realmente recorridos**, no de cálculos hechos. Un viaje se registra al
llegar a destino o al cancelarlo habiendo avanzado; si se corta a mitad de camino, queda
guardado el tramo efectivamente manejado.

Promedios mensuales: cantidad de viajes, distancia, energía, tiempo y costo.

### 5.6 Cuentas y sesión

Registro con usuario y contraseña o con Google. Cada usuario ve solo sus vehículos y su
historial.

---

## 6. Recorrido del usuario

```
   Landing pública  ──►  Crear cuenta  ──►  Cargar vehículo  ──►  Elegir origen/destino
   (qué es, datos)       (o Google)        (catálogo o IA)       (mapa, GPS, dirección)
                                                                          │
                                                                          ▼
   Historial y      ◄──  Seguimiento    ◄──  Iniciar viaje  ◄──   Resultado del viaje
   promedios             en vivo (GPS)                            (km, tiempo, paradas)
```

**Primer uso:** el único paso obligatorio antes de rutear es cargar un vehículo. Se
resuelve escribiendo el nombre del modelo: el catálogo completa el resto.

**Uso recurrente:** el vehículo queda guardado. El camino desde abrir la app hasta tener una
ruta es indicar carga actual, origen y destino.

---

## 7. Base de datos del producto

Todo dato que el producto muestra proviene de una fuente verificable.

| Dato | Volumen | Fuente | Verificación |
|---|---|---|---|
| Red vial | 63.833 intersecciones, 97.293 tramos | OpenStreetMap vía Overpass API | Datos abiertos, regenerables |
| Estaciones de carga | 209 estaciones, 246 conectores | Listado público de UTE Movilidad | Conector, potencia y puertos oficiales |
| Modelos de vehículo | 880 modelos | 14 curados para Uruguay + 866 de dataset global | Especificaciones de fabricante |
| Peajes | Tramos marcados en OSM | `toll=yes` de OpenStreetMap | Tarifas reales donde se conocen |
| Precio de energía | Tarifa aproximada por kWh | Orden de magnitud de tarifa residencial UTE | **Aproximado** — ver limitaciones |

**Cobertura geográfica en dos niveles.** Montevideo tiene detalle de calle residencial; el
resto del país, red troncal. La decisión es deliberada: el ruteo interdepartamental real va
por rutas nacionales, y cubrir 19 departamentos con detalle urbano completo generaría un
grafo de cientos de miles de nodos sin mejorar las rutas que la gente efectivamente hace.
Como excepción, cada estación de carga fuera de la capital tiene un radio de detalle fino a
su alrededor, para que quede conectada a la red por calles reales y no por una línea recta
sintética.

**Sobre la precisión de las coordenadas de estaciones.** Las ubicaciones son las que
publica el propio operador: se toman del mapa oficial de UTE
(`movilidad.ute.com.uy`), no de geocodificar direcciones.

Vale contar cómo se llegó a eso, porque es una lección de producto. La primera versión
geocodificaba cada dirección con Nominatim, asumiendo que UTE no publicaba coordenadas. El
resultado parecía aceptable, pero al contrastarlo contra la fuente oficial resultó que
**79 de las 209 estaciones estaban a más de 1 km de su posición real, y la peor a 119 km**.
En una app que manda a alguien a cargar con la batería justa, mandarlo al lugar equivocado
es la peor falla posible — y no se manifestaba como un error, sino como un dato que se veía
bien. La corrección movió 157 coordenadas y bajó la distancia mediana entre cada estación y
la calle más cercana de 0,58 km a **0,04 km**.

La actualización hoy es un comando (`backend/scripts/refresh_ute_stations.py`), así que el
dataset deja de envejecer solo.

---

## 8. Posicionamiento frente a alternativas

| | RouteEV | CarGO | UTE Mueve | Google Maps / Waze |
|---|---|---|---|---|
| Planifica paradas de carga | **Sí, dentro del algoritmo** | Sí | No | No |
| Redes de carga cubiertas | 1 (UTE, 209 estaciones) | **11+ operadores** | 1 (UTE, propia) | Parcial |
| Estado de los cargadores en tiempo real | No | Sí | **Sí, oficial** | No |
| Países | Uruguay | **Uruguay, Argentina, Brasil** | Uruguay | Global |
| App móvil nativa | No (web) | **Sí** | **Sí** | **Sí** |
| Navegación giro a giro | No | **Sí** | No | **Sí** |
| Reseñas y reportes de la comunidad | No | **Sí** | No | **Sí** |
| Costo del viaje en pesos | **Sí, energía + peajes** | Parcial | Tarifas | No |
| Tráfico en tiempo real | No | Parcial | No | **Sí** |
| Modelo de negocio | — | Gratis + Pro USD 4,99 | Gratis (servicio de UTE) | Gratis |

**La lectura honesta:** RouteEV no entra a un mercado vacío. CarGO ya hace planificación de
ruta con paradas de carga en los tres países, agregando once operadores contra el único que
cubre RouteEV, y con app nativa, navegación y estado en tiempo real. En las dimensiones que
un conductor evalúa primero —cuántos cargadores veo, están libres, me lleva hasta ahí— hoy
RouteEV está por detrás.

**Dónde podría estar la diferencia, y qué falta para confirmarlo:** RouteEV modela el
consumo arista por arista sobre el grafo vial real y trata la recarga como una transición
más del espacio de estados, no como una parada sugerida a posteriori. Si eso produce
estimaciones más fieles que las de un planificador que aproxima por distancia en línea recta
es una hipótesis razonable, **pero no está verificada**: requiere comparar ambos resultados
contra viajes reales medidos. Sin esa verificación, no es un argumento de venta.

**El otro camino, menos disputado:** las herramientas existentes son productos de consumo,
para una persona con un auto. La gestión de flotas —qué vehículo asignar a qué ruta, costo
por kilómetro, planificación de carga de varios autos a la vez— es un problema distinto que
hoy nadie atiende localmente.

---

## 9. Decisiones de producto

Decisiones tomadas deliberadamente, con su razón.

### 9.1 El resultado es el viaje, no la comparación de algoritmos

La primera versión mostraba Dijkstra contra A\* lado a lado como resultado central de cada
consulta. Es información técnica interesante, pero no es lo que le importa a quien va a
manejar: le importa si llega, cuánto tarda y dónde para.

La comparación pasó a ser motor interno, documentado en [`TECHNICAL.md`](TECHNICAL.md). El
resultado visible es el viaje. **Medición que respalda la decisión:** correr los dos algoritmos duplicaba la espera
(5,9 s contra 2,9 s en un Montevideo–Punta del Este) para mostrar exactamente el mismo
resultado, porque ambos encuentran la misma ruta óptima.

### 9.2 Porcentaje de batería, no kWh

El usuario mira su tablero y ve un porcentaje. Pedirle kWh lo obliga a una conversión que
no tiene por qué saber hacer. La app deriva la autonomía real en kilómetros a partir del
porcentaje y de las especificaciones del vehículo.

### 9.3 El historial guarda viajes recorridos, no rutas calculadas

Un cálculo de ruta es una consulta; un viaje es un hecho. Si el historial guardara cada
cálculo, se llenaría de exploraciones que nunca ocurrieron y los promedios mensuales serían
ruido. Se registra el viaje al completarse, y si se cancela a mitad de camino queda el
tramo real recorrido.

### 9.4 Landing pública separada de la aplicación

Quien no conoce el proyecto necesita entender qué resuelve antes de que se le pida crear
una cuenta. La landing explica el problema y muestra los datos reales; la app vive detrás
de la sesión.

### 9.5 Transparencia sobre la calidad del dato

Cuando una dirección geocodificada cae lejos de cualquier calle cubierta, el producto lo
avisa. Cuando la ubicación del usuario está fuera del área cubierta, lo dice con la
distancia concreta. Preferimos un aviso incómodo a un número inventado que se ve bien.

### 9.6 Sin build de frontend

El frontend es HTML, CSS y JavaScript planos. Para un producto de este alcance, una cadena
de build agrega mantenimiento sin agregar capacidad. Se abre el archivo y se lee lo que
hace.

---

## 10. Qué no hace (alcance explícitamente excluido)

Decisiones de no-alcance, para que la evaluación sea justa:

- **No da indicaciones giro a giro.** Planifica el viaje; no reemplaza al navegador durante
  el manejo.
- **No reserva ni cobra carga.** No hay integración transaccional con UTE.
- **No conoce el estado en vivo de las estaciones.** No sabe si un cargador está ocupado o
  fuera de servicio.
- **No usa tráfico en tiempo real.** La penalización por tráfico es estática, por tipo de
  vía.
- **No rutea calle por calle dentro de ciudades del interior.** Llega hasta sus rutas de
  acceso.
- **No es una app móvil nativa.** Es una aplicación web; funciona en el navegador del
  celular pero no está instalada.

---

## 11. Estado actual y madurez

### 11.1 Qué funciona hoy

Todo el alcance de §5 está implementado y verificado end-to-end: cálculo de rutas con
paradas de carga sobre el país entero, gestión de vehículos con los 880 modelos, los tres
métodos de selección de origen/destino, seguimiento por GPS con aviso de velocidad
recomendada, historial y cuentas.

### 11.2 Calidad verificada

| Dimensión | Estado |
|---|---|
| Corrección del algoritmo | Tests automatizados verifican que Dijkstra y A\* coinciden en el costo óptimo sobre el grafo real, con y sin restricción de batería |
| Seguridad | Revisión dedicada: 12 tests de regresión, Semgrep con 356 reglas (OWASP Top 10, secrets, auditoría) en verde, revisión manual de autenticación y autorización |
| Integración continua | Semgrep y la suite de tests corren en cada push |

### 11.3 Limitaciones conocidas

- **Precio de la energía aproximado.** El costo en pesos usa una tarifa del orden de
  magnitud correcto, no la tarifa vigente exacta de movilidad eléctrica de UTE.
- **Tarifas de peaje parciales.** Se conocen las de algunos peajes; el resto es
  estimación.
- **Coordenadas de estaciones con precisión variable.** Marcada explícitamente por
  estación.
- **Tráfico estático.**
- **Escala limitada por CPU.** El cálculo de ruta es intensivo y Python no paraleliza:
  varias consultas simultáneas se turnan. El techo de usuarios concurrentes es bajo.
- **Aviso de velocidad recomendada, no calibrado.** El modelo que relaciona velocidad con
  consumo (solo en el frontend, durante el viaje en vivo) es una aproximación razonada, no
  calibrada con datos reales de ningún vehículo. No influye en el cálculo de la ruta —eso
  sigue usando el consumo constante por vehículo—, es puramente informativo.

---

## 12. Camino a producción

**El producto no está desplegado.** Lo que falta no es funcionalidad, sino operación. El
detalle está en [`DEPLOY.md`](DEPLOY.md); lo esencial:

| Bloqueante | Por qué |
|---|---|
| Rotar el secreto de sesión | El anterior estuvo commiteado y debe darse por comprometido |
| Base en disco persistente | Sin esto, cada actualización borra todos los usuarios |
| Copias de respaldo | Hoy no hay ninguna |
| HTTPS | Obligatorio: los navegadores no dan la ubicación en orígenes inseguros |

**Restricción de infraestructura que condiciona la elección:** el servidor tarda alrededor
de un minuto en arrancar (arma el grafo entero en memoria). Eso descarta todas las
plataformas que duermen el servicio o escalan a cero — Vercel, Lambda, el plan gratuito de
Render. Requiere un proceso siempre encendido con disco persistente.

**Riesgo operativo a vigilar:** la geocodificación de direcciones usa el servicio público
de OpenStreetMap, que tiene límites de uso. Con tráfico real conviene cachear resultados o
migrar a un proveedor propio.

---

## 13. Evolución posible

Ordenado por relación entre valor y esfuerzo. No es un compromiso de roadmap.

### Corto plazo

1. **Validar con usuarios reales.** El paso más importante y el único que no es técnico. Es
   la brecha honesta de este documento (ver §2.2).
2. **Tarifas exactas de energía y peaje.** Convierte una estimación en un número confiable.
3. **Caché de geocodificación.** Elimina el principal riesgo operativo.

### Mediano plazo

4. **Estado de las estaciones en tiempo real**, si UTE expusiera una API. Sería el salto
   más grande en utilidad real: hoy el producto puede mandar a alguien a un cargador
   ocupado.
5. **Detalle urbano en ciudades del interior**, priorizando por uso.
6. **Rutas guardadas y favoritas.**

### Largo plazo

7. **Tráfico en tiempo real.**
8. **Aplicación móvil o PWA instalable.**
9. **Perfiles de consumo aprendidos** del historial real de cada usuario, en vez de la
   especificación de fábrica.

---

## 14. Glosario

| Término | Significado |
|---|---|
| **Autonomía** | Kilómetros que el vehículo puede recorrer con la carga disponible |
| **Ansiedad de autonomía** | Temor a quedarse sin batería antes de llegar; principal barrera declarada de adopción |
| **Grafo vial** | Representación del mapa como intersecciones (nodos) conectadas por tramos de calle (aristas) |
| **Nodo / intersección** | Un cruce real de calles |
| **Arista / tramo** | El segmento de calle entre dos cruces |
| **Conector** | Tipo de enchufe de carga (CCS2, GB/T, Type 2). No todos los autos aceptan todos |
| **kWh** | Kilovatio-hora: unidad de energía. La "capacidad del tanque" de un eléctrico |
| **Potencia de carga (kW)** | Qué tan rápido entra la energía. Determina el tiempo de parada |
| **Geocodificación** | Convertir una dirección escrita en coordenadas |
| **Dijkstra / A\*** | Algoritmos de búsqueda de camino óptimo. A\* usa una estimación de distancia al destino para explorar menos |

---

*Documento de producto de RouteEV. Para diseño e implementación ver
[`TECHNICAL.md`](TECHNICAL.md); para puesta en producción, [`DEPLOY.md`](DEPLOY.md).*
