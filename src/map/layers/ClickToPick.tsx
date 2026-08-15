import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";
import { getNearestNode } from "../../api/graph";
import { haversineKm } from "../../shared/geo";
import { useMapStore, type PickMode } from "../mapStore";
import { claimPickRole, DOUBLE_CLICK_GUARD_MS } from "../pickSequence";

// El backend nunca rechaza un click -- /api/graph/nearest siempre devuelve
// la interseccion mas cercana del grafo, sin tope de distancia (ver
// nearest_node en routeev-api/app/graph.py). En rutas interdepartamentales
// esas intersecciones estan muy espaciadas, asi que un click "impreciso"
// puede resolver a un punto bastante lejos de donde se tocó. Mismo umbral
// que ya usa /api/graph/geocode (distance_to_node_km > 2) para el aviso
// equivalente al buscar una dirección escrita.
const IMPRECISE_CLICK_KM = 2;

/**
 * Fija origen/destino al tocar el mapa, portado de js/map/mapCore.js.
 *
 * El guard contra el doble-click-para-zoom de Leaflet vive en pickSequence.ts
 * (DOUBLE_CLICK_GUARD_MS / claimPickRole) junto con la explicación del bug que
 * arreglan: acá lo importante es que cada toque tiene SU PROPIO timeout y se
 * queda con su rol en el momento del toque. La versión anterior guardaba un
 * único timeout y lo cancelaba en cada click nuevo, así que dos toques
 * deliberados a menos de 250 ms fijaban un solo punto -- y siempre el origen.
 */
interface ClickToPickProps {
  // severity "warn": el click se resolvió igual, pero lejos del punto real
  // (ver IMPRECISE_CLICK_KM). severity "error": no se pudo resolver nada.
  // msg null limpia cualquier aviso previo (p.ej. tras un click preciso).
  onError: (msg: string | null, severity?: "error" | "warn") => void;
}

export function ClickToPick({ onError }: ClickToPickProps) {
  // Timeouts agendados y todavía sin correr. Un array, no un solo id: ver el
  // comentario del componente.
  const pendingRef = useRef<number[]>([]);
  // Roles ya repartidos entre toques que todavía no llegaron al store (están
  // esperando el timeout o la respuesta de /api/graph/nearest).
  const claimedRef = useRef<PickMode[]>([]);

  useEffect(() => {
    // Desmontar el mapa con toques agendados dejaría timeouts escribiendo en
    // un store que la pantalla ya no está mirando. La lista se lee al
    // desmontar a propósito (es justo la que quedó viva en ese momento), no
    // una copia congelada al montar.
    const pending = pendingRef.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.length = 0;
    };
  }, []);

  function releaseClaim(role: PickMode) {
    const i = claimedRef.current.indexOf(role);
    if (i !== -1) claimedRef.current.splice(i, 1);
  }

  async function resolvePick(role: PickMode, lat: number, lon: number) {
    try {
      const node = await getNearestNode(lat, lon);
      const store = useMapStore.getState();
      if (role === "origin") {
        store.setOrigin(node);
        store.setPickMode("destination");
      } else {
        store.setDestination(node);
      }
      const distanceKm = haversineKm(lat, lon, node.lat, node.lon);
      if (distanceKm > IMPRECISE_CLICK_KM) {
        // Ya no un banner de texto y listo: se guarda el punto tocado junto al
        // nodo elegido para poder dibujar la distancia en el mapa y ofrecer
        // aceptar o volver a marcar (ver ImprecisePickLink y RouteInputPanel).
        // El backend snapea a NODOS del grafo (cruces y estaciones), nunca al
        // punto más cercano sobre la calle, así que a escala de país esto pasa
        // seguido en ruta abierta -- y antes la persona quedaba con un aviso y
        // ninguna salida.
        store.setImprecisePick({ role, node, clickLat: lat, clickLon: lon, distanceKm });
      }
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo resolver ese punto del mapa.", "error");
    } finally {
      releaseClaim(role);
      // El punto quedó fijado (o falló): en cualquiera de los dos casos el
      // mapa dejó de estar "esperando que toques". Solo si no quedan más
      // toques en camino, para no apagar el cartel en medio de una ráfaga.
      if (claimedRef.current.length === 0) useMapStore.getState().stopPicking();
    }
  }

  useMapEvents({
    click(e) {
      // lat/lng se copian ACA: el objeto de evento de Leaflet se reusa entre
      // eventos, y para cuando corre el timeout puede ya no describir este
      // toque.
      const { lat, lng } = e.latlng;
      const role = claimPickRole(useMapStore.getState().pickMode, claimedRef.current);
      claimedRef.current.push(role);
      const timeoutId = window.setTimeout(() => {
        // splice y no `= filter(...)`: la lista se muta en el lugar, nunca se
        // reemplaza, porque el cleanup de arriba se quedó con ESTE array.
        const i = pendingRef.current.indexOf(timeoutId);
        if (i !== -1) pendingRef.current.splice(i, 1);
        void resolvePick(role, lat, lng);
      }, DOUBLE_CLICK_GUARD_MS);
      pendingRef.current.push(timeoutId);
    },
    dblclick() {
      // Los dos clicks del doble click siguen agendados (el dblclick llega a
      // pocos ms del segundo): se cancelan los dos y se devuelven sus roles.
      for (const id of pendingRef.current) window.clearTimeout(id);
      pendingRef.current.length = 0;
      claimedRef.current.length = 0;
    },
  });

  return null;
}
