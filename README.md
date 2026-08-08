# RouteEV Web

Frontend de **RouteEV**, planificador de rutas para autos eléctricos en Uruguay
que verifica batería tramo a tramo sobre el mapa vial real. Vite + React +
TypeScript, en `webapp/`. La API (FastAPI) vive en otro repo, `routeev-api`.

## Estructura

```
webapp/     # la app: código fuente, tests, config de build/deploy
front2.md   # inventario del sitio estático original, stack elegido y
            # sistema de diseño del rebuild (documento histórico del proceso
            # de migración)
```

El sitio estático original (HTML/CSS/JS vanilla, sin build) fue reemplazado
por completo por el rebuild en `webapp/`.

## Correr localmente

```bash
cd webapp
npm install
npm run dev
```

`webapp/README.md` tiene el resto de los scripts (`build`, `lint`, `test`) y
cómo conectar con un backend distinto al de producción.

## Deploy

`webapp/` se publica en Vercel: Root Directory = `webapp`, build `npm run
build`, output `dist`. `webapp/vercel.json` resuelve el SPA fallback (rutas
limpias tipo `/showroom` sin depender de un servidor propio).

Al publicar:

1. Agregar el origen del frontend a `CORS_ALLOW_ORIGINS` del backend
   (`routeev-api`).
2. Confirmar que `VITE_API_BASE_URL` (o el proxy de `vite.config.ts` en dev)
   apunte a la API viva.
