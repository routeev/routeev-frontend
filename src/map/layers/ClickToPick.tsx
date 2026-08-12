import { useRef } from "react";
import { useMapEvents } from "react-leaflet";
import { getNearestNode } from "../../api/graph";
import { haversineKm } from "../../shared/geo";
import { useMapStore } from "../mapStore";

// El backend nunca rechaza un click -- /api/graph/nearest siempre devuelve
// la interseccion mas cercana del grafo, sin tope de distancia (ver
// nearest_node en routeev-api/app/graph.py). En rutas interdepartamentales
// esas intersecciones estan muy espaciadas, asi que un click "impreciso"
// puede resolver a un punto bastante lejos de donde se tocó. Mismo umbral
// que ya usa /api/graph/geocode (distance_to_node_km > 2) para el aviso
// equivalente al buscar una dirección escrita.
const IMPRECISE_CLICK_KM = 2;

/**
 * Fija origen/destino al tocar el mapa, portado de js/map/mapCore.js. Un
 * doble click para hacer zoom (comportamiento default de Leaflet) dispara
 * DOS "click" antes del "dblclick" -- sin el delay, cada doble click
 * terminaba fijando origen Y destino donde se hizo zoom.
 */
interface ClickToPickProps {
  // severity "warn": el click se resolvió igual, pero lejos del punto real
  // (ver IMPRECISE_CLICK_KM). severity "error": no se pudo resolver nada.
  // msg null limpia cualquier aviso previo (p.ej. tras un click preciso).
  onError: (msg: string | null, severity?: "error" | "warn") => void;
}

export function ClickToPick({ onError }: ClickToPickProps) {
  const pendingRef = useRef<number | null>(null);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setDestination = useMapStore((s) => s.setDestination);
  const setPickMode = useMapStore((s) => s.setPickMode);

  useMapEvents({
    click(e) {
      if (pendingRef.current != null) window.clearTimeout(pendingRef.current);
      pendingRef.current = window.setTimeout(async () => {
        pendingRef.current = null;
        try {
          const node = await getNearestNode(e.latlng.lat, e.latlng.lng);
          const pickMode = useMapStore.getState().pickMode;
          if (pickMode === "origin") {
            setOrigin(node);
            setPickMode("destination");
          } else {
            setDestination(node);
          }
          const distanceKm = haversineKm(e.latlng.lat, e.latlng.lng, node.lat, node.lon);
          if (distanceKm > IMPRECISE_CLICK_KM) {
            onError(
              `Se usó el cruce más cercano del mapa, a ${distanceKm.toFixed(1)} km de donde tocaste — puede no ser exacto.`,
              "warn"
            );
          } else {
            onError(null);
          }
        } catch (err) {
          onError(err instanceof Error ? err.message : "No se pudo resolver ese punto del mapa.", "error");
        }
      }, 250);
    },
    dblclick() {
      if (pendingRef.current != null) {
        window.clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
    },
  });

  return null;
}
