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
ROUTEEV_API_BASE_URL=https://routeev-api.onrender.com
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

El frontend lee `ROUTEEV_API_BASE_URL` desde `.env` mediante `scripts/dev-server.js`.
El backend debe permitir el origen del frontend con `CORS_ALLOW_ORIGINS`.

## Deploy

Este repo se puede publicar como sitio estatico. Cuando tenga URL publica, agregar ese origen en `CORS_ALLOW_ORIGINS` del backend en Render.
