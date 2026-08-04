# RouteEV Web

Frontend estatico de RouteEV: HTML, CSS y JavaScript vanilla con Leaflet.

Este repo contiene la interfaz web. La API vive en `routeev-api`.

## Correr localmente

Copiar la configuracion local:

```bash
copy .env.example .env
```

En `.env`, elegir que backend usar:

```env
ROUTEEV_API_BASE_URL=https://routeev-api-production.up.railway.app
```

Levantar el servidor local:

```bash
node scripts/dev-server.js
```

Abrir `http://127.0.0.1:5500`.

## Paginas

| Ruta | Archivo | Cuenta |
|---|---|---|
| `/` | `landing.html` | No |
| `/showroom` | `showroom.html` | No |
| `/login` | `login.html` | No |
| `/app` | `app.html` | Si |
| `/profile` | `profile.html` | Si |

`/showroom` es la unica pantalla completa que funciona sin cuenta: buscador sobre los 880
modelos, ficha con los datos calculados por la API, foto del modelo buscada por su nombre y
simulacion de un viaje real ("¿llego a Salto con este auto?"). Consume `/api/showroom/*`.

## Conectar con la API

En **desarrollo**, `scripts/dev-server.js` lee `ROUTEEV_API_BASE_URL` de `.env` y
sintetiza `/js/env.js` en cada pedido. Ese archivo no existe en el repo.

En **produccion** no corre el dev-server, asi que `/js/env.js` da 404 y manda el
fallback de `js/config.js`, que apunta a la API de produccion. Si la API cambia de
URL hay que actualizar `ROUTEEV_API_PRODUCCION` en ese archivo.

El backend debe permitir el origen del frontend con `CORS_ALLOW_ORIGINS`.

## Deploy

Este repo se publica como sitio estatico (Netlify, Vercel, GitHub Pages,
Cloudflare Pages: cualquiera sirve la carpeta tal cual). No hace falta build.

Al publicarlo:

1. Agregar el origen del frontend a `CORS_ALLOW_ORIGINS` del backend.
2. Verificar que `ROUTEEV_API_PRODUCCION` en `js/config.js` apunte a la API viva.
3. Actualizar los `og:url` y `og:image` de `landing.html` y `showroom.html` con
   el dominio real, y subir `img/og-cover.png` (1200x630).
