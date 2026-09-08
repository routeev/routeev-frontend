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

## Deploy

Proyecto `routeev-web` en Vercel, conectado por Git a este repo (**público** — necesario:
el plan Hobby de Vercel bloquea el deploy automático de un commit cuyo autor no sea el
dueño de la cuenta cuando el repo es privado). Cada push a `main` dispara un build y
redeploy solo; `routeev.uy` apunta ahí (nameservers de Vercel).

`vercel.json` fija `"framework": "vite"` a propósito: si el proyecto se recrea a mano en
el dashboard (en vez de con `vercel link`, que auto-detecta), Vercel lo deja en "Other" con
`Output Directory` apuntando a `public/` en vez de `dist/` — el build queda mal armado y el
deploy se cuelga en "Building…" sin logs ni error visible. No sacar esa línea.

Si un deploy automático queda colgado o "Blocked" sin razón clara (chequear en el
dashboard: Deployments → el deploy → mensaje de bloqueo), la salida que funciona siempre es
compilar local y subir el build ya armado, sin pasar por el chequeo de git:

```bash
npx vercel pull --yes --environment production   # una vez, o si cambiaron env vars
npx vercel build --prod
npx vercel deploy --prebuilt --prod --yes
```

## Notas de diseño

- Tokens de diseño en `src/styles/tokens.css`.
- `CertaintyLine` (`src/shared/`) es el elemento visual de firma del sistema de diseño.
- Cliente de API tipado en `src/api/`.
- `RouteErrorBoundary` (`src/shared/`) atrapa errores de carga de los chunks lazy por ruta (`routes.tsx`) y ofrece recargar — cubre el caso de un deploy nuevo mientras alguien tiene la app vieja abierta.
- Meta tags OG/Twitter estáticos en `index.html` (no via `react-helmet`): los crawlers de WhatsApp/Twitter/Instagram no ejecutan JS, así que necesitan las tags ya presentes en el HTML servido para armar la preview del link.
- `StationsLayer` (`src/map/layers/`) no dibuja las ~261 estaciones de carga de una: sin ruta calculada solo muestra la elegida a mano en `StationsPanel`, y con ruta calculada solo las paradas que esa ruta realmente usa — dibujarlas todas saturaba el mapa apenas se abría `/app`.
