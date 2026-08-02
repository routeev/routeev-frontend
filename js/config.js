// Configuracion del frontend estatico.
//
// En desarrollo separado, apunta al backend local:
//   window.ROUTEEV_API_BASE_URL = "http://127.0.0.1:8000";
//
// En produccion, reemplazar por el origen publico de la API:
//   window.ROUTEEV_API_BASE_URL = "https://api.routeev.uy";
//
// Vacio mantiene el comportamiento de mismo origen.
window.ROUTEEV_API_BASE_URL = window.ROUTEEV_API_BASE_URL || "http://127.0.0.1:8000";
