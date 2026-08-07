# RouteEV Web — rebuild (Vite + React + TypeScript)

Rebuild incremental del frontend estático de `routeev-web` (ver `../front2.md` para el plan completo: inventario del sitio actual, stack elegido y por qué, sistema de diseño, y la estrategia de migración página por página).

Mientras dura la migración, este proyecto convive con el sitio estático original apuntando a la misma API — no se toca nada fuera de esta carpeta.

## Correr localmente

```bash
npm install
npm run dev
```

No hace falta `.env`: por defecto, en dev, el propio servidor de Vite proxea `/api/*` hacia la API de producción (`vite.config.ts`) — evita el bloqueo de CORS que da pegarle directo a Railway desde `localhost` (`routeev-api` no tiene ese origen en `CORS_ALLOW_ORIGINS`, y es otro repo). Copiar `.env.example` a `.env` solo hace falta para apuntar a otro backend (uno local, por ejemplo).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Type-check (`tsc -b`) + build de producción |
| `npm run preview` | Sirve el build de `dist/` localmente |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Vitest (una corrida) |
| `npm run test:watch` | Vitest en modo watch |

## Estado

**Pasos 1–7 completos** (`front2.md`, Parte 2): las 7 pantallas del sitio están migradas. Queda el paso 8 (cutover en producción).

- Tokens de diseño portados 1:1 desde `css/style.css` (`src/styles/tokens.css`), más la escala tipográfica/espaciado formalizada en la Parte 3.2.
- Cliente de API tipado (`src/api/`), misma sesión en `localStorage` que el sitio viejo (mismas claves — necesario para que ambos convivan durante el cutover).
- Router con las 7 rutas del sitio y los guards de sesión (`ProtectedRoute` / `GuestOnlyRoute`), reemplazando la tabla `ROUTES` de `scripts/dev-server.js`. `vercel.json` resuelve el SPA fallback nativamente (el motivo original de esta migración: rutas limpias que 404 en producción).
- `CertaintyLine` (`src/shared/`): el elemento de firma del sistema de diseño (Parte 3.4), en sus tres escalas: `hero` en landing (datos de ejemplo), `macro` en el resultado del simulador del showroom (datos reales de la simulación).
- **`/`, `/privacidad`, `/terminos`**: contenido y copy completos, SEO por ruta con `react-helmet-async` (sumado durante la implementación, ver Parte 2), reveal-on-scroll formalizado (`Reveal`, `useInViewOnce`).
- **`/login`**: toggle login/registro, confirmación por código de 6 dígitos, Google Sign-In vía `@react-oauth/google` (reemplaza el polling manual de `waitForGoogleIdentityServices()`), formularios con React Hook Form.
- **`/showroom`**: catálogo completo con búsqueda/filtro/orden 100% client-side (`useShowroomCatalog`), cola de fotos con concurrencia limitada vía `IntersectionObserver` (`photoQueue.ts`, mismo patrón que el original), ficha de detalle, búsqueda por IA, y el simulador de viaje con mapa animado en `react-leaflet` (`SimulationMap`, `useSimulationAnimation` — la posición del auto y la telemetría en vivo se actualizan de forma imperativa vía refs para no saturar React con renders a 60fps, igual que el original evitaba tocar el DOM virtual ahí). La lógica pura de la animación (`simulationTimeline.ts`) tiene tests unitarios.
- **`/app`**: mapa Leaflet con el grafo vial, estaciones, autocomplete de origen/destino (local + geocoding explícito), "usar mi ubicación", alta de vehículo, cálculo de ruta Dijkstra vs A*, dashboard de resultados y **seguimiento de viaje en vivo por GPS real** (`useLiveTrip`) con el asesor de velocidad. El estado del mapa vive en Zustand (`mapStore.ts`); las cinco cargas paralelas de `loadAllWithRetry()` las reemplaza TanStack Query (`useMapLoaders`). Lógica pura con tests: `speedAdvisory.ts` (4 niveles de aviso) y `routeProjection.ts` (proyección GPS sobre la ruta).
- **`/profile`**: cuenta con foto, vehículos (alta manual / por catálogo / identificación por foto con IA, con gestión de blob URLs y revoke), tablas de consumo mensual y por vehículo, e historial con replay hacia `/app?replay=1`. Cada fila del historial lleva la línea de certeza en escala `micro` (`historyCertainty.ts`, con tests).

### Pendiente

- **Paso 8 — cutover**: el sitio estático original sigue siendo el que está publicado. Los 27 endpoints y sus contratos no cambiaron, así que ambos pueden convivir contra la misma API mientras se corta pantalla por pantalla.
- **CORS en producción**: en dev el proxy de Vite lo evita, pero para publicar esta app hay que agregar su origen a `CORS_ALLOW_ORIGINS` en el backend (`routeev-api`, otro repo).
- **Tamaño del bundle**: ~650 kB (~200 kB gzip) en un solo chunk; el build avisa. Se resuelve con code-splitting por ruta (`React.lazy` + `Suspense`), que además sacaría Leaflet del bundle inicial de la landing.
