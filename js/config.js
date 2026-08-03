// Configuracion del frontend estatico.
//
// scripts/dev-server.js genera /js/env.js desde .env y define
// window.ROUTEEV_API_BASE_URL antes de cargar este archivo.
//
// Fallback para abrir el frontend con un servidor estatico simple.
window.ROUTEEV_API_BASE_URL = window.ROUTEEV_API_BASE_URL || "http://127.0.0.1:8000";
