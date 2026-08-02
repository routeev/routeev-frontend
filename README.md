# RouteEV Web

Frontend estatico de RouteEV: HTML, CSS y JavaScript vanilla con Leaflet.

Este repo contiene la interfaz web. La API vive en `routeev-api`.

## Correr localmente

Servir esta carpeta con cualquier servidor estatico. Por ejemplo:

```bash
python -m http.server 5500
```

Abrir `http://127.0.0.1:5500`.

## Conectar con la API

Editar `js/config.js` y apuntar al backend:

```js
window.ROUTEEV_API_BASE_URL = "http://127.0.0.1:8000";
```

El backend debe permitir el origen del frontend con `CORS_ALLOW_ORIGINS`.

## Deploy

Este repo se puede publicar como sitio estatico. En produccion, `js/config.js` debe apuntar al origen publico de `routeev-api`.
