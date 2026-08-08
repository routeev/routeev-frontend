# RouteEV Web — rebuild (Vite + React + TypeScript)

Rebuild del frontend estático original de `routeev-web` (HTML/CSS/JS vanilla) a Vite + React + TypeScript. El sitio estático viejo ya se dio de baja de producción y se retiró del repo — esta carpeta es la app.

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

Migración completa: las 7 pantallas del sitio están portadas y el cutover en producción ya se hizo (el sitio estático viejo se dio de baja y se retiró del repo).

- Tokens de diseño portados 1:1 desde el `style.css` del sitio viejo (`src/styles/tokens.css`), más una escala tipográfica/espaciado formalizada.
- Cliente de API tipado (`src/api/`), mismas claves de `localStorage` que usaba el sitio viejo.
- Router con las 7 rutas del sitio y los guards de sesión (`ProtectedRoute` / `GuestOnlyRoute`), con code-splitting por ruta (`React.lazy` + `Suspense`, `src/lazyPages.tsx`). `vercel.json` resuelve el SPA fallback nativamente (el motivo original de esta migración: rutas limpias que 404 en producción).
- `CertaintyLine` (`src/shared/`): el elemento de firma del sistema de diseño (Parte 3.4), en sus tres escalas: `hero` en landing (datos de ejemplo), `macro` en el resultado del simulador del showroom (datos reales de la simulación).
- **`/`, `/privacidad`, `/terminos`**: contenido y copy completos, SEO por ruta con `react-helmet-async` (sumado durante la implementación, ver Parte 2), reveal-on-scroll formalizado (`Reveal`, `useInViewOnce`).
- **`/login`**: toggle login/registro, confirmación por código de 6 dígitos, Google Sign-In vía `@react-oauth/google` (reemplaza el polling manual de `waitForGoogleIdentityServices()`), formularios con React Hook Form.
- **`/showroom`**: catálogo completo con búsqueda/filtro/orden 100% client-side (`useShowroomCatalog`), cola de fotos con concurrencia limitada vía `IntersectionObserver` (`photoQueue.ts`, mismo patrón que el original), ficha de detalle, búsqueda por IA, y el simulador de viaje con mapa animado en `react-leaflet` (`SimulationMap`, `useSimulationAnimation` — la posición del auto y la telemetría en vivo se actualizan de forma imperativa vía refs para no saturar React con renders a 60fps, igual que el original evitaba tocar el DOM virtual ahí). La lógica pura de la animación (`simulationTimeline.ts`) tiene tests unitarios.
- **`/app`**: mapa Leaflet con el grafo vial, estaciones, autocomplete de origen/destino (local + geocoding explícito), "usar mi ubicación", alta de vehículo, cálculo de ruta Dijkstra vs A*, dashboard de resultados y **seguimiento de viaje en vivo por GPS real** (`useLiveTrip`) con el asesor de velocidad. El estado del mapa vive en Zustand (`mapStore.ts`); las cinco cargas paralelas de `loadAllWithRetry()` las reemplaza TanStack Query (`useMapLoaders`). Lógica pura con tests: `speedAdvisory.ts` (4 niveles de aviso) y `routeProjection.ts` (proyección GPS sobre la ruta).
- **`/profile`**: cuenta con foto, vehículos (alta manual / por catálogo / identificación por foto con IA, con gestión de blob URLs y revoke), tablas de consumo mensual y por vehículo, e historial con replay hacia `/app?replay=1`. Cada fila del historial lleva la línea de certeza en escala `micro` (`historyCertainty.ts`, con tests).

### Pendiente

- **CORS en producción**: en dev el proxy de Vite lo evita, pero hay que confirmar que el origen de producción de esta app esté en `CORS_ALLOW_ORIGINS` del backend (`routeev-api`, otro repo).
