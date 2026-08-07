# RouteEV Web — Migración a Vite + React

Documento base para migrar el frontend estático actual (HTML/CSS/JS vanilla) a un proyecto Vite + React. Primera parte: inventario completo del sitio actual. Segunda parte: stack recomendado y notas de migración. Tercera parte: sistema de diseño para el rebuild.

---

## Parte 1 — Inventario del sitio actual

### 1.1 Páginas

Convención global: `<html lang="es-UY">`, favicon SVG `/img/logo-mark.svg`, Google Fonts (Inter, JetBrains Mono, Space Grotesk) con `preconnect`, `theme-color #0a0e13`. Páginas de cuenta (`login`, `app`, `profile`) llevan `<meta name="robots" content="noindex">`; las públicas no.

| Página | Auth | CSS | JS | Resumen |
|---|---|---|---|---|
| `landing.html` | No | `style.css` + `landing.css` | `landing.js` | Home pública. SEO completo (canonical, OG, Twitter Card, JSON-LD `WebApplication`). Stats hardcodeadas en HTML (63.800+ intersecciones, 19 departamentos, 209 estaciones, 880 modelos). Copy estático en 4 secciones + CTA. Animación reveal-on-scroll con `IntersectionObserver`. |
| `login.html` | No (redirige a `/app` si ya hay sesión) | `style.css` + `login.css` | `login.js` | Login/registro con toggle, confirmación de email por código de 6 dígitos, Google Sign-In (Google Identity Services, condicional a `google_client_id` del backend). `?crear=1` fuerza modo registro. |
| `app.html` | Sí | `style.css` + `app.css` + Leaflet CSS | `map.js` (módulo ES) + `js/map/*` | Pantalla principal: mapa Leaflet, autocomplete de origen/destino, gestión de vehículos, cálculo de ruta (Dijkstra vs A*), dashboard de resultados, seguimiento de viaje en vivo (GPS real). |
| `profile.html` | Sí | `style.css` + `app.css` + `profile.css` | `car-art.js` + `profile.js` | Cuenta (foto editable), vehículos (alta manual / por catálogo / por IA-foto), tablas de consumo mensual y por vehículo, historial de viajes con replay hacia `/app?replay=1`. |
| `showroom.html` | No | `style.css` + `landing.css` + `showroom.css` + Leaflet CSS | `car-art.js` + `showroom.js` (49 KB) | Catálogo público de 880 modelos: buscador, filtros, ficha de detalle, simulador de viaje animado sobre Leaflet. Deep link `?modelo=<id>`. Única pantalla completa sin cuenta. |
| `privacidad.html` / `terminos.html` | No | `style.css` + `landing.css` + `legal.css` | Ninguno | Legales estáticos, es-UY, referencias a Ley 18.331 y URCDP. |

### 1.2 Módulos JS (raíz `js/`)

- **`config.js`**: define `ROUTEEV_API_BASE_URL` con fallback a la URL de producción (Railway) si `env.js` (sintetizado solo en dev, no versionado) no está presente.
- **`api.js`**: cliente HTTP central (`apiFetch`), maneja JWT (`Authorization: Bearer`), sesión en `localStorage` (`routeev_token`, `routeev_username`), normaliza errores 422 de Pydantic, redirige a login en 401-con-token, formatters compartidos (`formatDuration`, `formatUyu`, `formatDate` — todos `es-UY` hardcodeado), y el objeto `api` con los 27 endpoints (detalle en 1.4).
- **`car-art.js`**: genera SVG placeholder de auto coloreado por hash del nombre (sin red).
- **`landing.js`**: guard de sesión suave (cambia CTAs a "Ir a la app") + reveal-on-scroll.
- **`login.js`**: toggle login/registro, flujo de confirmación por código, `waitForGoogleIdentityServices()` (polling anti-race-condition contra el script `async`), Google Sign-In condicional.
- **`map.js`**: guard de sesión + `import("./map/main.js")` **dinámico** (para que el guard corra antes de evaluar módulos con side-effects DOM).
- **`profile.js`**: orquesta 6 cargas en paralelo (`Promise.allSettled`), resize de foto en cliente (canvas, max 800px, JPEG q=0.82), gestión manual de blob URLs con revoke, mecanismo de replay vía `sessionStorage`.
- **`showroom.js`**: catálogo completo en memoria, filtro/orden/búsqueda 100% client-side, cola de carga de fotos con concurrencia limitada (2) vía `IntersectionObserver`, ficha de detalle, simulador de viaje animado con interpolación sobre polilínea real y `requestAnimationFrame` (respeta `prefers-reduced-motion`).

### 1.3 Módulos `js/map/` (ES modules, solo usados desde `app.html`)

| Módulo | Responsabilidad |
|---|---|
| `state.js` | Estado global compartido (`state`, `els`, `icons`), primer módulo evaluado. |
| `mapCore.js` | Instancia Leaflet, tiles CARTO dark, `setOrigin`/`setDestination`, debounce click-vs-dblclick (250ms). |
| `autocomplete.js` | Autocomplete local (sin red mientras se tipea) + geocoding explícito vía Nominatim, navegación por teclado. |
| `calculateGate.js` | Habilita/deshabilita el botón "Calcular ruta" según estado (separado para evitar ciclos de import). |
| `geolocation.js` | "Usar mi ubicación": `getCurrentPosition` con retry sin `enableHighAccuracy`, resuelve nodo más cercano vía API. |
| `graphData.js` | Carga grafo vial, estaciones, y nodos buscables (precalcula normalización para autocomplete). |
| `history.js` | Replay de un viaje pasado desde `sessionStorage` (sin volver a llamar al backend). |
| `routeCalc.js` | Llama `api.compareRoutes`, dibuja Dijkstra (ámbar, discontinua) y A* (cian, sólida), arma el dashboard. |
| `utils.js` | Puras: `haversineKmJs`, `normalizeForSearch` (NFD), `escapeHtml`, `hideSuggestions`. |
| `vehicles.js` | Select de vehículo, alta (manual / catálogo / IA), oculta IA si el backend la deshabilita. |
| `liveTrip.js` (29 KB) | Seguimiento GPS real, proyección sobre ruta, detección de llegada, **asesor de velocidad** (modelo heurístico), detección de recargas, logging no bloqueante, requiere HTTPS. |
| `main.js` | Entry point: `loadAllWithRetry()` (paralelo + botón reintentar), luego `loadReplayFromHistory()` y `checkAiLookupAvailable()`. |

### 1.4 API consumida (backend FastAPI, base URL configurable)

27 endpoints, todos vía `apiFetch`:

**Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/confirm-email`, `POST /api/auth/resend-confirmation`, `GET /api/auth/config` (feature flags: `google_client_id`, `ai_vehicle_lookup_enabled`), `POST /api/auth/google`.

**Usuario**: `GET /api/users/me`, `POST /api/users/me/photo` (FormData), `DELETE /api/users/me/photo`.

**Grafo/mapa**: `GET /api/graph`, `GET /api/graph/stations`, `GET /api/graph/searchable-nodes?limit=3000`, `POST /api/graph/nearest`, `GET /api/graph/geocode?q=`.

**Vehículos**: `GET /api/vehicles`, `GET /api/vehicles/models`, `POST /api/vehicles/lookup-ai`, `POST /api/vehicles/lookup-ai-photo` (FormData), `POST /api/vehicles`, `DELETE /api/vehicles/{id}`, `POST /api/vehicles/{id}/photo` (FormData), `DELETE /api/vehicles/{id}/photo`, `GET /api/vehicles/{id}/photo` (bytes → blob URL, fuera de `apiFetch`).

**Showroom (público)**: `GET /api/showroom/models[?concesionaria=]`, `GET /api/showroom/models/{id}`, `POST /api/showroom/lookup-ai`, `GET /api/showroom/imagen?q=`, `GET /api/showroom/destinos`, `POST /api/showroom/simulate`.

**Rutas/historial**: `POST /api/route/compare`, `POST /api/route/log-trip`, `GET /api/route/history`, `GET /api/route/monthly-stats`, `GET /api/route/vehicle-stats`.

### 1.5 Estado / auth / storage

- JWT en `localStorage` (`routeev_token`, `routeev_username`), sin refresh token. 401-con-token → limpia sesión y redirige.
- Guards de sesión repetidos a mano en cada página (login invierte la lógica, map/profile exigen token, landing es suave).
- `sessionStorage`: única clave `routeev_replay_trip`, puente `/profile` → `/app?replay=1`.
- `localStorage.routeev_api_base_url` como fallback secundario de config, aparentemente vestigial (para debugging manual).

### 1.6 CSS

Sin preprocesador ni build. Diseño basado en variables CSS en `:root` (`style.css`): `--bg`, `--bg-panel`, `--border`, `--text*`, `--accent-astar` (cian, **significado semántico fijo** = A*), `--accent-dijkstra` (ámbar = Dijkstra), `--point-origin`/`--point-dest`, `--danger`/`--ok`/`--accent-live`. Tres fuentes con roles fijos: `--font-display` (titulares), `--font-mono` (datos/telemetría), `--font-body`. Regla global `prefers-reduced-motion`.

| Archivo | Líneas | Alcance | Prefijo de clases |
|---|---|---|---|
| `style.css` | 380 | Base compartida (todas) | — |
| `landing.css` | 498 | landing, showroom (parcial), legales | `l-` |
| `app.css` | 1003 | app, profile | — |
| `showroom.css` | 1075 | showroom | `sr-` |
| `profile.css` | 328 | profile (reutiliza `.panel` de app.css) | — |
| `login.css` | 137 | login | — |
| `legal.css` | 85 | privacidad, términos | — |

### 1.7 Build / dev-server actual

`scripts/dev-server.js`: servidor Node puro (sin deps), puerto 5500, sirve archivos tal cual + tabla `ROUTES` propia para rutas limpias (`/login` → `login.html`, etc.) + sintetiza `/js/env.js` desde `.env` en cada request. **Sin build step.** Este mapeo de rutas limpias no tiene equivalente en el hosting de producción actual (no hay `_redirects`/`vercel.json`), lo cual ya causó bugs de 404 en producción (motivo original de esta migración).

### 1.8 SEO / accesibilidad / i18n

- SEO completo solo en `landing.html` y `showroom.html` (canonical, OG, Twitter Card, JSON-LD). `sitemap.xml` (4 URLs) + `robots.txt` coherentes.
- Accesibilidad: `aria-hidden` en SVGs decorativos, clase `sr-only`, `aria-pressed`/`aria-label`/`aria-current`, patrón manual `role="button"` + `tabindex` + `keydown` en tarjetas clicables, `prefers-reduced-motion` respetado en 3 lugares.
- i18n: no existe — todo hardcodeado en es-UY (incluido `Intl.NumberFormat("es-UY", ...)`).

### 1.9 Dependencias externas (CDN, sin npm)

| Dependencia | Uso |
|---|---|
| Google Fonts (Inter, JetBrains Mono, Space Grotesk) | Todas las páginas |
| Leaflet 1.9.4 (CSS + JS, unpkg) | `app.html`, `showroom.html` |
| Google Identity Services (`accounts.google.com/gsi/client`) | `login.html` |
| CARTO dark tiles (`basemaps.cartocdn.com`) | Runtime, en `mapCore.js`/`showroom.js` |
| API propia (Railway) | Todo el sitio |

No hay `package.json` en el repo — es 100% estático, cero bundler.

### 1.10 Contexto de producto (de `docs/`)

- **RouteEV** calcula rutas para vehículos eléctricos verificando batería tramo a tramo sobre el mapa vial real de Uruguay (63.833 nodos OSM, 19 departamentos, 209 estaciones UTE, 880 modelos con specs de fábrica), planificando paradas de carga automáticamente. Se posiciona contra Google Maps/Waze: "¿puedo hacer este viaje con la carga que tengo?" vs "cuál es el camino más rápido".
- Hay una línea de negocio B2B en desarrollo (flotas eléctricas, ligada al Plan Flota Verde del MIEM/MOVÉS), en etapa de validación con clientes (customer discovery), no de venta. Hoy el producto soporta multi-vehículo y costo por km, pero no multi-usuario por empresa ni atribución por conductor.

---

## Parte 2 — Stack recomendado para la migración

Ya definido: **Vite + React**. Estas son las piezas que arman el resto del stack, pensadas para el tamaño real de este proyecto (27 endpoints, mapa Leaflet interactivo, auth con JWT + Google, formularios con archivos, sin equipo grande) — nada sobredimensionado.

### Core
- **TypeScript**. Con 27 endpoints y payloads no triviales (dashboard de ruta, historial, catálogo de 880 modelos), tipar las respuestas del backend evita una clase entera de bugs silenciosos que hoy dependen de disciplina manual (`normalizeDetail` a mano, por ejemplo). Si el backend FastAPI expone OpenAPI/Swagger, generar los tipos con `openapi-typescript` en vez de escribirlos a mano.
- **React Router** (v7, antes v6). Reemplaza directamente la tabla `ROUTES` de `dev-server.js` y resuelve de raíz el bug de 404 en producción: con SPA + `index.html` fallback (soportado nativamente por Vercel/Netlify/Cloudflare Pages) no hace falta mantener config de rewrites a mano. Guards de sesión (hoy repetidos a mano en cada página) se centralizan en un `<ProtectedRoute>` / loader.

### Datos y estado servidor
- **TanStack Query (react-query)**. Encaja muy bien con lo que ya hace este código a mano: `Promise.allSettled` con botón de reintentar en `main.js` es exactamente lo que da `useQuery` con `retry`; el catálogo de 880 modelos que se baja una sola vez y se reusa (showroom) es un caso de manual de `staleTime` largo; el guard de 401 en `api.js` se vuelve un `onError` global. También simplifica el patrón productor/consumidor de carga de fotos si se combina con `useInfiniteQuery` para la paginación del showroom.
- **Zustand** para el estado del mapa (hoy `js/map/state.js`, un objeto mutable compartido entre ~10 módulos). Es el único estado realmente "cliente" complejo del sitio (origen/destino, vehículo seleccionado, resultado de ruta, modo pick). Evitar Redux acá: es overkill para un solo dominio de estado. El resto de las pantallas (login, profile, showroom) no necesita más que `useState`/`useReducer` locales.

### Mapa
- **react-leaflet**, manteniendo Leaflet 1.9 + los mismos tiles CARTO dark. No hace falta reescribir la lógica geométrica (`haversineKmJs`, proyección sobre ruta en `liveTrip.js`, interpolación del simulador en `showroom.js`) — esa parte es JS puro y se porta casi sin cambios a hooks (`useEffect` + refs) o se deja en utils compartidos. Alternativa a evaluar solo si el equipo prefiere control más fino sobre el ciclo de vida del mapa: Leaflet imperativo dentro de un hook propio (`useMap`), sin la capa de `react-leaflet`.

### Formularios
- **React Hook Form**. Cubre login/registro (con validación espejo del backend), confirmación por código, alta de vehículo (manual + con archivo para lookup por foto) y edición de perfil (foto). Poco boilerplate, buen soporte de campos tipo `FormData`/file uploads que ya usa este proyecto en 4 endpoints distintos.
- **Zod**, combinado con RHF (`@hookform/resolvers/zod`), para las mismas validaciones que hoy están hardcodeadas en `login.js` (regex de email, contraseña ≥10 caracteres) y para parsear/validar las respuestas de la API junto con los tipos generados de OpenAPI.

### Estilos
- Mantener el **design system de variables CSS existente** (`style.css`) tal cual — está bien pensado (roles semánticos fijos para colores y fuentes, ya con soporte de `prefers-reduced-motion`) y portarlo 1:1 evita relitigar decisiones visuales ya tomadas. Sobre eso, **CSS Modules** (soporte nativo de Vite, `Component.module.css`) para scopear el resto de las clases hoy prefijadas a mano (`l-`, `sr-`) por archivo/página. Evita instalar una librería de estilos nueva (Tailwind, styled-components) sin necesidad real — el sitio no tiene el problema de estilos inline gigantes que esas librerías resuelven, tiene CSS ya razonablemente organizado por página.

### Auth con Google
- **`@react-oauth/google`** en vez del `waitForGoogleIdentityServices()` con polling manual que hay hoy en `login.js` — encapsula exactamente esa condición de carrera contra el script `async`.

### SEO / head management
- **`react-helmet-async`** (sumado durante la implementación, no estaba en el plan original de esta sección). Necesario porque una SPA no puede variar `<title>`/`<meta>`/JSON-LD por ruta desde `index.html` solo — y el SEO de landing/showroom es explícitamente relevante (1.8, `docs/producto.md`). `HelmetProvider` envuelve la app una vez en `App.tsx`; cada página exporta su propio `<Helmet>` con el mismo contenido que hoy está hardcodeado en el `<head>` de cada `.html`.

### Imágenes / assets
- Los SVGs generados en runtime (`car-art.js`, hash de nombre → color) se portan como función pura sin cambios.
- Fotos de vehículo (privadas, requieren `Authorization`) siguen necesitando el patrón fetch-manual + blob URL — no hay atajo nativo de `<img src>` para eso; conviene envolverlo en un hook (`useAuthedImage(url)`) con cleanup de `URL.revokeObjectURL` en el `useEffect`, que es lo que hoy hace `profile.js` a mano.

### Calidad / tooling
- **ESLint + Prettier** con el plugin de React/hooks (`eslint-plugin-react-hooks` es el que más valor da acá, dado que hay bastante estado compartido entre módulos hoy).
- **Vitest + React Testing Library** para lógica pura que ya está aislada y es fácil de testear sin mockear DOM: `utils.js` (haversine, normalización), formatters de `api.js`, `computeSpeedAdvisory` de `liveTrip.js` (tiene 4 niveles documentados, buen candidato a tests de tabla).
- **Playwright**, opcional pero recomendado, para el flujo de cálculo de ruta end-to-end (login → seleccionar vehículo → origen/destino → calcular → dashboard) dado que es el corazón del producto y hoy no hay ningún test automatizado.

### Env / config
- Variables de entorno vía `import.meta.env.VITE_API_BASE_URL` (prefijo `VITE_` obligatorio en Vite), reemplazando el mecanismo actual de `env.js` sintetizado por el dev-server — Vite ya resuelve esto de forma nativa en dev y build, sin necesidad de un servidor Node custom.

### Deploy
- **Vercel o Netlify**, ambos con soporte nativo de SPA fallback (`vercel.json` con rewrite a `/index.html`, o Netlify detecta Vite automáticamente) — esto elimina definitivamente el problema que motivó la migración (rutas limpias que dependían de una tabla de rewrites que solo existía en el dev-server local y nunca se replicó en producción).

### Estructura de carpetas sugerida (feature-based)

```
src/
  api/            # cliente http (fetch/axios) + hooks de TanStack Query por dominio
  auth/           # login, registro, confirmación, Google, ProtectedRoute
  map/            # pantalla /app: mapa, autocomplete, cálculo de ruta, trip en vivo
  profile/        # pantalla /profile
  showroom/       # pantalla /showroom
  landing/        # pantalla /
  shared/         # design system, componentes UI genéricos, utils puras (haversine, normalizeForSearch, escapeHtml)
  routes.tsx      # definición de React Router
```

### Estrategia de migración sugerida

Migración incremental por página, no big-bang, dado que hoy no hay tests automatizados que den red de seguridad. Reordenada tras la Parte 3 para que el sistema de diseño (tokens, kit de componentes, elemento de firma) se construya **una sola vez, antes** de la primera pantalla real, en vez de reinventarse página a página — ese era el hueco de la secuencia anterior: proponía el design system en la Parte 3 pero la estrategia lo daba por "portado" sin un paso propio.

1. **Fundamentos**: Vite + React + TS + Router. Tokens de color/espaciado/tipografía de 3.2 pasados literalmente a `:root` (mismos nombres, sin relitigar valores). Tipos generados desde el OpenAPI del backend + cliente `apiFetch` tipado (mismo contrato que hoy, mismo manejo de 401/422). ESLint + Prettier + Vitest configurados desde el día uno, no al final.
2. **Kit de componentes compartido** (`shared/ui`): botón/input/panel/error-banner/info-banner ya definidos en `style.css`, portados a componentes React sobre CSS Modules — sin research de diseño nuevo, es 1:1 con lo que ya existe. En este mismo paso se construye el **elemento de firma** (3.4, "línea de certeza") como componente aislado con datos mock (`<CertaintyLine points={...} scale="micro|macro|hero" />`), porque se reusa en landing, showroom y `/app`: conviene resolverlo una vez, revisarlo visualmente, y darlo por cerrado antes de consumirlo en tres pantallas distintas — construirlo tarde obligaría a retocar las tres. 
3. **`landing` + legales** (sin estado, sin API) — valida el pipeline de build/deploy y el SEO (meta tags, sitemap), y es el primer lugar real donde `CertaintyLine` corre en modo hero/generativo con datos de ejemplo (3.3). Buen punto de control temprano: si el signature element no funciona visualmente acá, se corrige antes de que dependa de datos reales.
4. **`login`** (auth + Google + confirmación) — desbloquea el `<ProtectedRoute>`/guard de sesión reusable que necesitan los tres pasos siguientes.
5. **`showroom`** (pública, sin auth, pero la UI más compleja: filtros, ficha, simulador animado) — ejercita react-leaflet y TanStack Query a fondo (catálogo de 880 modelos con `staleTime` largo), y es donde `CertaintyLine` pasa a modo "macro" con datos reales de una simulación.
6. **`app`** (mapa + cálculo de ruta + trip en vivo) — el núcleo del producto, migrado con el estado de mapa ya resuelto en Zustand (Parte 2) y `CertaintyLine` reusado en el dashboard sin volver a diseñarlo. Se deja para este punto porque toca GPS real y hoy no tiene ningún test automatizado — conviene reservarle más tiempo de prueba manual y, si hace falta, un test de `Playwright` del flujo login → calcular ruta → iniciar viaje antes de dar la página por cerrada.
7. **`profile`** en paralelo o después de `app` (reusa los mismos hooks de vehículos/fotos), con `CertaintyLine` en modo "micro" (sparkline) en cada fila del historial.
8. **Cutover**: el backend no cambia en ningún paso — los 27 endpoints y sus contratos se mantienen intactos, así que el sitio estático actual y el nuevo en Vite conviven apuntando a la misma API mientras se corta página por página (se puede, por ejemplo, servir `/showroom` desde el build de Vite mientras `/app` sigue en el estático, con un reverse proxy o redirects a nivel de hosting). El estático viejo no se apaga hasta que las 7 páginas estén migradas y verificadas — es el rollback natural de cada paso: si una página nueva falla en producción, el redirect vuelve a apuntar a la versión estática sin tocar código.

---

## Parte 3 — Sistema de diseño para el rebuild

### 3.0 Punto de partida

Sujeto: **RouteEV**, planificador de viajes para autos eléctricos en Uruguay. Audiencia primaria: dueños de VE con ansiedad de autonomía real (¿llego con la carga que tengo?), no turistas de un mapa genérico. Audiencia secundaria (B2B en validación): gestores de flota que necesitan justificar costo/km y factibilidad de ruta, no una demo bonita. El trabajo de cada pantalla no es el mismo — landing vende certeza, showroom es un catálogo técnico, `/app` es un instrumento de cabina que se usa mientras se maneja — así que el sistema tiene que sostener las tres sin diluirse en una sola estética decorativa.

**El sistema actual (`css/style.css`) ya toma una decisión real, no genérica**, y este documento la formaliza en vez de reemplazarla: panel de instrumentos eléctrico de noche, con dos acentos de significado fijo (`--accent-astar` cian → algoritmo A*, `--accent-dijkstra` ámbar → Dijkstra, la referencia). No es "fondo casi negro + un acento vibrante" porque hay motivo funcional detrás de cada color — el acento identifica un algoritmo real en pantalla, no decora. Eso es lo que se conserva. Lo que agrega esta parte 3 es lo que hoy falta para un rebuild prolijo: una escala tipográfica y de espaciado formal (hoy son valores sueltos por componente), wireframes concretos por pantalla clave, y un elemento de firma que hoy no existe.

### 3.1 Autocrítica (contra el default genérico)

Antes de formalizar, la prueba que pide la skill: ¿este sistema es indistinguible del que saldría para cualquier fintech/SaaS oscuro? Tres chequeos:

1. **Paleta**: no es "negro + un acento" (cliché #2 de AI). Es negro + *dos* acentos con contrato semántico fijo, más un tercer par (`--point-origin`/`--point-dest`) que identifica extremos de ruta en tres superficies a la vez (panel, mapa, popup). Pasa: cada color responde una pregunta del producto, ninguno es gusto personal.
2. **Tipografía**: Space Grotesk + JetBrains Mono + Inter, con roles fijos (titulares / telemetría / cuerpo) que además espejan el theme de la app móvil compañera (`routeev-movil/src/theme/colors.ts`, según el comentario en `style.css`). Pasa: es una decisión de continuidad de marca cross-plataforma, no la pareja de fuentes "de siempre".
3. **Punto débil real**: el sistema no tiene todavía un **elemento de firma** — nada que, visto sin logo, diga "esto es RouteEV" y no "esto es un dashboard oscuro cualquiera". Landing hoy resuelve el hero con un SVG decorativo de grafo (`#uy-graph`, `aria-hidden`) que es un buen instinto pero no se reusa en ningún otro lado. Esto es lo que resuelve la sección 3.4.

### 3.2 Tokens formalizados

Color (nombres ya existentes en `style.css`, sin renombrar — el rebuild los porta tal cual a `theme.ts`/CSS vars):

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#0a0e13` | Fondo base |
| `--bg-panel` | `#121821` | Paneles, tarjetas |
| `--bg-panel-raised` | `#1a212c` | Elementos flotantes sobre panel (botones, dropdowns) |
| `--accent-astar` | `#34e3a8` | A* — algoritmo principal, CTA primario, foco |
| `--accent-dijkstra` | `#f2a154` | Dijkstra — baseline de referencia, nunca decorativo |
| `--point-origin` / `--point-dest` | `#ffffff` / `#b18cf2` | Extremos de ruta, consistentes en panel + mapa |
| `--danger` / `--ok` | `#ef5b5b` / `#34e3a8` | Estados, siempre con texto explícito al lado (nunca solo color) |

Tipografía — escala formal para el rebuild (hoy implícita, ad hoc por componente):

| Rol | Fuente | Tamaño/interlineado | Peso | Uso |
|---|---|---|---|---|
| Display XL | Space Grotesk | 56px / 1.05 | 700 | H1 de hero (landing, ficha de showroom) |
| Display L | Space Grotesk | 36px / 1.1 | 600 | H2 de sección |
| Display M | Space Grotesk | 22px / 1.25 | 600 | H3, título de tarjeta/panel |
| Body L | Inter | 17px / 1.5 | 400 | Lead/subtítulo bajo un H1 |
| Body | Inter | 14px / 1.5 | 400–600 | Texto de interfaz (default actual) |
| Mono data | JetBrains Mono | 14px / 1.4, tabular-nums | 500 | Cifras de telemetría (ya existe como `.mono-num`) |
| Eyebrow | JetBrains Mono | 11px, +0.14em tracking, uppercase | 500 | Ya existe como `.eyebrow`, formalizar su uso también como *label de dato*, no solo de sección |

Espaciado — grid de 4px (hoy los componentes usan valores sueltos como `11px`/`18px` sin escala declarada; el rebuild fija una escala y los componentes redondean a ella): `4, 8, 12, 16, 24, 32, 48, 64, 96`.

Radios y sombras: se mantienen `--radius` (12px), `--radius-sm` (8px), `--radius-pill`, `--shadow-panel` y `--shadow-float` tal cual — ya están bien diferenciados (panel plano vs. elemento flotando sobre el mapa) y no hay motivo para tocarlos.

### 3.3 Layout por pantalla clave

**Landing — hero como tesis, no como banner.** El copy ya existente (`¿Llega tu auto eléctrico? Fijate antes de salir.`) es la tesis correcta: pregunta de ansiedad real, resuelta en la misma frase. El wireframe formaliza dos columnas asimétricas, no el layout centrado-con-gradiente típico:

```
┌──────────────────────────────────────────────────────────┐
│ RouteEV      Showroom  Cómo funciona    Iniciar sesión  [Crear cuenta] │
├──────────────────────────────────────────────────────────┤
│  EYEBROW · MAPA VIAL REAL DE URUGUAY                        │
│                                                              │
│  ¿Llega tu auto                        ┌────────────────┐  │
│  eléctrico?                            │                │  │
│  Fijate antes de salir.                │  línea de      │  │
│                                         │  certeza       │  │
│  Copy de apoyo, 1–2 líneas.            │  (signature,   │  │
│                                         │  ver 3.4)      │  │
│  [Ver el catálogo →]  [Crear cuenta]   │                │  │
│                                         └────────────────┘  │
│  63.833 nodos · 209 estaciones · 880 modelos                │
└──────────────────────────────────────────────────────────┘
```

**Showroom — ficha como spec sheet, no como product card de e-commerce.** La tarjeta de catálogo ya es correcta (foto + nombre + 2 cifras); lo que se formaliza es la ficha de detalle, que hoy es una lista de datos y debería leerse como el spec sheet de un instrumento:

```
┌───────────────────────────────────────────────────┐
│ ← Volver al catálogo                                │
│ ┌───────────┐  MODELO X                             │
│ │           │  Autonomía   420 km                   │
│ │  foto     │  Batería     74 kWh                    │
│ │           │  Carga rápida  Sí · 120 kW              │
│ └───────────┘  ────────── línea de certeza ──────── │
│                 Simulación: Montevideo → Rivera       │
│                 [Simular otro viaje]                   │
└───────────────────────────────────────────────────┘
```

**`/app` — cabina, no dashboard de SaaS.** El layout actual (sidebar + mapa + dashboard inferior) ya es el correcto para "instrumento que se usa mientras se maneja"; se formaliza la jerarquía visual: el mapa ocupa siempre ≥60% del viewport, el dashboard de resultados nunca tapa el mapa (se desliza desde abajo, no hace overlay total), y los datos de telemetría en vivo (`liveTrip.js`) usan siempre `--font-mono` con `tabular-nums` para que las cifras no salten de ancho en cada refresco.

```
┌───────────┬────────────────────────────────────┐
│ RouteEV    perfil · usuario · salir              │
├───────────┼────────────────────────────────────┤
│ TU VIAJE   │                                    │
│ ○ origen   │                                    │
│ ● destino  │              MAPA                  │
│            │        (Dijkstra ámbar ┄┄           │
│ VEHÍCULO   │         A* cian ───)                │
│ [select]   │                                    │
│            │                                    │
│ ESTACIONES ├────────────────────────────────────┤
│ (lista)    │ 420km · 2 paradas · $UYU · [Iniciar]│
└───────────┴────────────────────────────────────┘
```

### 3.4 Elemento de firma: la línea de certeza

El sistema hoy no tiene un signature element reusado entre pantallas — se propone uno, derivado directamente del cálculo que *es* el producto, no de un ícono decorativo elegido por gusto.

**Qué es**: un perfil horizontal batería-vs-distancia — una sola línea continua que arranca alta (verde/cian), desciende gradualmente con el consumo del tramo, y da un salto vertical hacia arriba en cada parada de carga (marcada con un tick ámbar), terminando en el destino por encima de cero (o entrando en banda roja si el viaje no es factible con ese vehículo). Esto no es una metáfora inventada: es literalmente el dato que ya devuelve `POST /api/route/compare` tramo a tramo — el signature element es la visualización directa de la respuesta a "¿llego con la carga que tengo?".

**Dónde se usa, a tres escalas**:
- **Micro** (glifo, sin ejes): sparkline de 40×16px en cada fila de "Historial de viajes" en `/profile` y, opcionalmente, como marca de agua sutil detrás del wordmark en el nav — reemplaza cualquier ícono decorativo genérico por uno que es del producto.
- **Macro** (gráfico real, con eje X en km): el dashboard de resultados en `/app` y la ficha de simulación en `/showroom`, con datos reales de la ruta calculada — deja de ser una lista de stats sueltas y se vuelve un instrumento legible de un vistazo.
- **Hero/generativo**: en el hero de landing, la misma forma se dibuja con datos reales de una ruta de ejemplo (p. ej. Montevideo → Rivera, la misma que usa el `og:image` actual) y se anima con un `stroke-dashoffset` que la "dibuja" al cargar la página — sustituye o evoluciona el actual SVG `#uy-graph` hacia algo que se reconoce en el resto del sitio.

**Motion**: el trazo del hero se dibuja una vez al cargar (600–800ms, `ease-out`), respeta `prefers-reduced-motion` (se muestra completo, sin animar). El reveal-on-scroll que ya existe (`IntersectionObserver`, clase `.l-reveal`) se mantiene, formalizando timing a 400ms `ease-out` con stagger de 60ms entre elementos hermanos — nada más se anima por defecto; los micro-hovers de tarjetas (showroom, historial) son el único otro lugar con movimiento: `translateY(-2px)` + borde inferior que toma el color semántico correspondiente (ok/danger/accent-astar según corresponda), 120ms.

### 3.5 Voz y contenido

El copy existente ya acierta el tono y sirve de referencia para todo texto nuevo del rebuild: **"¿Llega tu auto eléctrico? Fijate antes de salir."** — pregunta real del usuario, voz activa, vos rioplatense, cero relleno de marketing. Reglas para mantenerlo:

- Cifras siempre concretas y reales (`63.833 nodos`, `209 estaciones`), nunca vagas (`miles de nodos`).
- Botones nombran la acción, no el sistema: "Calcular ruta", no "Enviar"; "Iniciar viaje", no "Confirmar". El texto de confirmación reusa el mismo verbo ("Ruta calculada", no "Éxito").
- Errores y vacíos en voz de instrumento, no de persona: `js/map/geolocation.js` ya hace esto bien (mensaje distinto por código de error de GPS — `PERMISSION_DENIED`, `TIMEOUT`) y `error-banner`/`info-banner` en `style.css` ya separan error de aviso neutral; el rebuild extiende ese mismo criterio a cada estado nuevo (carga fallida del grafo, catálogo vacío en showroom, historial vacío en perfil): decir qué pasó y qué hacer, sin "¡Ups!" ni disculpas.

### 3.6 Piso de calidad (no negociable)

- Contraste AA verificado (el comentario en `style.css` sobre `--text-faint` ya documenta el cálculo exacto contra los tres fondos — mantener ese estándar para cualquier color nuevo).
- Foco visible con `outline` de 2px en `--accent-astar` en todo control interactivo (ya es regla global, portar tal cual).
- `prefers-reduced-motion` respetado en cada animación nueva, no solo en las heredadas.
- Responsive real hasta ~360px de ancho, con el mapa de `/app` como el caso más exigente (sidebar colapsa antes que el mapa se rompa).
- El elemento de firma (3.4) es el único lugar con licencia para "lucirse" — todo lo demás (formularios, tablas, paneles) se mantiene disciplinado y sin decoración añadida.
