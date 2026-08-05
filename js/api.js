/**
 * Cliente HTTP compartido por login.js y map.js: agrega el JWT a cada
 * pedido y normaliza los errores del backend a un simple Error con mensaje.
 */

const TOKEN_KEY = "routeev_token";
const USERNAME_KEY = "routeev_username";
const API_BASE_URL = (
  window.ROUTEEV_API_BASE_URL ||
  localStorage.getItem("routeev_api_base_url") ||
  ""
).replace(/\/+$/, "");

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return API_BASE_URL + path;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

// Compartido por map.js y profile.js (ambos cargan este script antes que el
// suyo propio): minutos crudos a "Xh Ymin" legible, sin la hora cuando el
// viaje dura menos de una hora.
function formatDuration(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Pesos uruguayos, sin decimales (asi se muestran los precios en la vida
// real: "$ 1.234", no "$ 1.234,00").
function formatUyu(value) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(
    Math.max(0, value)
  );
}

// Compartido por map.js (dashboard de un viaje replay) y profile.js
// (historial): fecha+hora en formato local uruguayo.
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// El "detail" de un error de FastAPI casi siempre es un string, pero en un
// 422 (fallo de validacion de Pydantic) es un ARRAY de objetos
// {loc, msg, type} -- uno por campo que no paso. Pasar eso directo a
// `new Error(...)` lo convierte a texto con el .toString() por defecto de
// cada objeto, que da "[object Object]" (uno por cada error, separados por
// coma). Aca nos quedamos solo con los mensajes, que son lo unico legible
// para quien usa la pagina.
function normalizeDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e === "object" ? e.msg : String(e)))
      .filter(Boolean)
      .join(" ");
  }
  return null;
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  // FormData (subida de foto de vehiculo, ver uploadVehiclePhoto): el propio
  // navegador arma el Content-Type con el boundary del multipart. Si lo
  // fijamos nosotros a mano el pedido queda mal formado y el backend no
  // encuentra el archivo.
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(apiUrl(path), Object.assign({}, options, { headers }));

  if (res.status === 401 && token) {
    // Un 401 solo significa "la sesion expiro" cuando HABIA un token de por
    // medio. Sin token (login/registro/google fallido, por ejemplo) un 401
    // es simplemente credenciales invalidas -- eso lo maneja la rama de
    // abajo, mostrando el detail real que mando el backend.
    clearSession();
    if (location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Sesion expirada, inicia sesion de nuevo");
  }

  if (!res.ok) {
    let detail = "Error " + res.status;
    try {
      const data = await res.json();
      detail = normalizeDetail(data.detail) || detail;
    } catch (e) {
      /* respuesta sin cuerpo JSON */
    }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

const api = {
  // El usuario se identifica por correo (no por un nombre de usuario que el
  // elige): ver RegisterRequest/LoginRequest en backend/app/schemas.py.
  register: (email, password) =>
    apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  // Solo hace falta cuando el registro devuelve confirmation_required=true
  // (el servidor tiene mail de confirmacion activo, ver /api/auth/config).
  confirmEmail: (email, code) =>
    apiFetch("/api/auth/confirm-email", { method: "POST", body: JSON.stringify({ email, code }) }),
  resendConfirmation: (email) =>
    apiFetch("/api/auth/resend-confirmation", { method: "POST", body: JSON.stringify({ email }) }),
  authConfig: () => apiFetch("/api/auth/config"),
  googleLogin: (idToken) => apiFetch("/api/auth/google", { method: "POST", body: JSON.stringify({ id_token: idToken }) }),

  getGraph: () => apiFetch("/api/graph"),
  getStations: () => apiFetch("/api/graph/stations"),
  getSearchableNodes: () => apiFetch("/api/graph/searchable-nodes?limit=500"),
  // POST aunque solo consulte: la coordenada puede ser la ubicacion real del
  // usuario, y en la URL de un GET quedaria registrada en los logs de acceso
  // del servidor y de cualquier proxy. Ver NearestNodeRequest en schemas.py.
  getNearestNode: (lat, lon) =>
    apiFetch("/api/graph/nearest", { method: "POST", body: JSON.stringify({ lat, lon }) }),
  geocode: (address) => apiFetch(`/api/graph/geocode?q=${encodeURIComponent(address)}`),

  listVehicles: () => apiFetch("/api/vehicles"),
  listEvModels: () => apiFetch("/api/vehicles/models"),
  lookupVehicleAi: (query) => apiFetch("/api/vehicles/lookup-ai", { method: "POST", body: JSON.stringify({ query }) }),
  createVehicle: (payload) => apiFetch("/api/vehicles", { method: "POST", body: JSON.stringify(payload) }),
  deleteVehicle: (id) => apiFetch(`/api/vehicles/${id}`, { method: "DELETE" }),

  uploadVehiclePhoto: (id, blob) => {
    const form = new FormData();
    form.append("file", blob, "vehiculo.jpg");
    return apiFetch(`/api/vehicles/${id}/photo`, { method: "POST", body: form });
  },
  deleteVehiclePhoto: (id) => apiFetch(`/api/vehicles/${id}/photo`, { method: "DELETE" }),
  // No pasa por apiFetch: la respuesta es la imagen en bytes, no JSON, y hay
  // que convertirla a un blob: URL para poder ponerla en un <img src>. El
  // fetch manual (en vez de un <img src="/api/...">) es lo que permite mandar
  // el header Authorization -- un <img> no puede agregar headers propios.
  async vehiclePhotoUrl(id) {
    const token = getToken();
    const res = await fetch(apiUrl(`/api/vehicles/${id}/photo`), {
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  },

  // --- Showroom publico (sin cuenta, ver showroom_routes.py en la API) -----
  showroomModels: (concesionaria) =>
    apiFetch("/api/showroom/models" + (concesionaria ? `?concesionaria=${encodeURIComponent(concesionaria)}` : "")),
  showroomModel: (modelId) => apiFetch(`/api/showroom/models/${encodeURIComponent(modelId)}`),
  showroomLookupAi: (query) => apiFetch("/api/showroom/lookup-ai", { method: "POST", body: JSON.stringify({ query }) }),
  showroomImage: (nombre) => apiFetch(`/api/showroom/imagen?q=${encodeURIComponent(nombre)}`),
  showroomDestinos: () => apiFetch("/api/showroom/destinos"),
  showroomSimulate: (payload) => apiFetch("/api/showroom/simulate", { method: "POST", body: JSON.stringify(payload) }),

  compareRoutes: (payload) => apiFetch("/api/route/compare", { method: "POST", body: JSON.stringify(payload) }),
  logTrip: (payload) => apiFetch("/api/route/log-trip", { method: "POST", body: JSON.stringify(payload) }),
  getHistory: () => apiFetch("/api/route/history"),
  getMonthlyStats: () => apiFetch("/api/route/monthly-stats"),
  getVehicleStats: () => apiFetch("/api/route/vehicle-stats"),
};
