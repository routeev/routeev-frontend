# RouteEV Web

Frontend de RouteEV — planificador de rutas para autos eléctricos en Uruguay. Vite + React + TypeScript.

En producción: [routeev.uy](https://routeev.uy).

## Correr localmente

```bash
npm install
npm run dev
```

No hace falta `.env` para desarrollo normal (ver `.env.example` solo si necesitás apuntar a otro backend).

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

## Stack

- Vite + React 19 + TypeScript
- React Router, con code-splitting por ruta
- Zustand (estado del mapa) + TanStack Query (datos remotos)
- react-leaflet (mapa)
- CSS Modules, sin frameworks de CSS
- Vitest + Testing Library

## Estructura de rutas

| Ruta | Contenido |
|---|---|
| `/` | Landing |
| `/login` | Login / registro |
| `/showroom` | Catálogo de modelos + simulador de viaje |
| `/app` | Mapa, ruteo y seguimiento de viaje en vivo |
| `/profile` | Cuenta, vehículos e historial |
| `/privacidad`, `/terminos` | Legales |

## Notas de diseño

- Tokens de diseño en `src/styles/tokens.css`.
- `CertaintyLine` (`src/shared/`) es el elemento visual de firma del sistema de diseño.
- Cliente de API tipado en `src/api/`.
- `RouteErrorBoundary` (`src/shared/`) atrapa errores de carga de los chunks lazy por ruta (`routes.tsx`) y ofrece recargar — cubre el caso de un deploy nuevo mientras alguien tiene la app vieja abierta.
- Meta tags OG/Twitter estáticos en `index.html` (no via `react-helmet`): los crawlers de WhatsApp/Twitter/Instagram no ejecutan JS, así que necesitan las tags ya presentes en el HTML servido para armar la preview del link.
