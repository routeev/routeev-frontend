/**
 * "Usar mi ubicacion" como origen: le pide al navegador la posicion real del
 * dispositivo y la resuelve al nodo real mas cercano del grafo (mismo
 * criterio que un click en el mapa).
 */

import { state, els } from "./state.js";
import { haversineKmJs } from "./utils.js";
import { map, setOrigin, setPickMode } from "./mapCore.js";

function showMyLocationResult(message, kind) {
  els.myLocationResult.textContent = message;
  els.myLocationResult.classList.remove("hidden", "warn", "error");
  if (kind) els.myLocationResult.classList.add(kind);
}

/**
 * Pide la ubicacion real del dispositivo y la fija como origen.
 *
 * El navegador muestra su propio cartel de "¿Permitir acceso a tu
 * ubicacion?" en cuanto se llama a getCurrentPosition: no hay forma de
 * dispararlo antes ni de preguntarlo por adelantado desde la pagina. Por eso
 * el boton avisa que va a pedir permiso, en vez de que el cartel aparezca de
 * la nada.
 *
 * La coordenada del GPS casi nunca cae exactamente sobre una calle del
 * grafo, asi que se resuelve al nodo real mas cercano (mismo criterio que un
 * click en el mapa) y se avisa si quedo lejos.
 */
function useMyLocation() {
  if (els.myLocationBtn.disabled) return;

  if (!navigator.geolocation) {
    showMyLocationResult("Este navegador no puede darnos tu ubicacion.", "error");
    return;
  }

  els.myLocationBtn.disabled = true;
  const textoOriginal = els.myLocationBtn.innerHTML;
  els.myLocationBtn.textContent = "Buscando tu ubicacion...";
  showMyLocationResult("Si el navegador te pregunta, elegi «Permitir».");

  const restaurarBoton = () => {
    els.myLocationBtn.disabled = false;
    els.myLocationBtn.innerHTML = textoOriginal;
  };

  const onSuccess = async (pos) => {
    const { latitude, longitude } = pos.coords;
    try {
      const node = await api.getNearestNode(latitude, longitude);
      state.nodesById.set(node.id, node);
      setOrigin(node);
      setPickMode("destination");
      map.setView([node.lat, node.lon], 15);

      const distanciaKm = haversineKmJs(latitude, longitude, node.lat, node.lon);
      if (distanciaKm > 2) {
        // Pasa sobre todo si el usuario no esta en Uruguay, o esta en una
        // zona que el grafo no cubre con detalle. Mejor decirlo que fijar
        // un origen a 40 km sin avisar.
        showMyLocationResult(
          `Estas a ${distanciaKm.toFixed(1)} km de la calle mas cercana que cubre el mapa. ` +
            `Se uso «${node.name}» como origen, pero puede no ser preciso.`,
          "warn"
        );
      } else {
        showMyLocationResult(`Origen fijado en ${node.name}.`);
      }
    } catch (err) {
      showMyLocationResult(err.message || "No se pudo ubicar tu posicion en el mapa.", "error");
    } finally {
      restaurarBoton();
    }
  };

  // Mensajes por codigo: "no anduvo" no le sirve a nadie, y sobre todo
  // el caso PERMISSION_DENIED necesita explicar que el permiso se
  // rehabilita desde el navegador, no desde esta pagina.
  const mensajesError = {
    1: "No nos diste permiso para ver tu ubicacion. Podes habilitarlo desde el candado en la barra de direcciones del navegador.",
    2: "No se pudo determinar tu ubicacion. Revisa que el GPS o la ubicacion del dispositivo esten encendidos.",
    3: "La busqueda de tu ubicacion tardo demasiado. Proba de nuevo.",
  };

  // Una notebook/PC de escritorio no tiene chip GPS: pedir alta precision
  // (enableHighAccuracy) fuerza al navegador a esperar una posicion mas
  // exacta de la que puede conseguir, y en muchos casos eso nunca llega
  // dentro del timeout -- terminaba en "tardo demasiado" incluso con
  // Wi-Fi andando bien. Ante ESE timeout puntual (codigo 3) se reintenta
  // una vez sin alta precision (ubicacion por Wi-Fi/IP: menos exacta pero
  // mucho mas rapida de resolver) antes de darse por vencido.
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (err) => {
      if (err.code === err.TIMEOUT) {
        showMyLocationResult("No hay GPS: buscando tu ubicacion aproximada por Wi-Fi...", "warn");
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err2) => {
            showMyLocationResult(mensajesError[err2.code] || "No se pudo obtener tu ubicacion.", "error");
            restaurarBoton();
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
        return;
      }
      showMyLocationResult(mensajesError[err.code] || "No se pudo obtener tu ubicacion.", "error");
      restaurarBoton();
    },
    // enableHighAccuracy activa el GPS real en el celular (mas preciso, pero
    // mas lento y gasta mas bateria). Vale la pena: fijar un origen con la
    // precision de una antena de celular puede errarle por kilometros. En
    // desktop, sin GPS, este intento suele terminar en timeout y cae al
    // reintento sin alta precision de arriba.
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

els.myLocationBtn.addEventListener("click", useMyLocation);
