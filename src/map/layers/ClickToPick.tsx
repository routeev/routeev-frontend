import { useRef } from "react";
import { useMapEvents } from "react-leaflet";
import { getNearestNode } from "../../api/graph";
import { useMapStore } from "../mapStore";

/**
 * Fija origen/destino al tocar el mapa, portado de js/map/mapCore.js. Un
 * doble click para hacer zoom (comportamiento default de Leaflet) dispara
 * DOS "click" antes del "dblclick" -- sin el delay, cada doble click
 * terminaba fijando origen Y destino donde se hizo zoom.
 */
export function ClickToPick({ onError }: { onError: (msg: string) => void }) {
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
        } catch (err) {
          onError(err instanceof Error ? err.message : "No se pudo resolver ese punto del mapa.");
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
