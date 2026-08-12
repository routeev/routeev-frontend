import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { ClickToPick } from "./layers/ClickToPick";
import { GraphLayer } from "./layers/GraphLayer";
import { LiveTripMarker } from "./layers/LiveTripMarker";
import { OriginDestinationMarkers } from "./layers/OriginDestinationMarkers";
import { RouteLayers } from "./layers/RouteLayers";
import { StationsLayer } from "./layers/StationsLayer";
import { getCurrentPositionWithFallback } from "./useGeolocation";
import { useMapStore } from "./mapStore";

const MONTEVIDEO: [number, number] = [-34.89, -56.16];
const AUTO_LOCATE_ZOOM = 15;

function CaptureMap() {
  const map = useMap();
  useEffect(() => {
    // Use the store setter via getState inside the effect to avoid
    // subscribing this component to the whole store and creating
    // potential render-effect loops when the setter identity changes.
    const { setLeafletMap } = useMapStore.getState();
    setLeafletMap(map);
    return () => useMapStore.getState().setLeafletMap(null);
    // Intentionally depend only on `map` — the setter is read directly
    // from the store to avoid re-running if selector returns a new ref.
  }, [map]);

  useEffect(() => {
    // Centra el mapa en la ubicacion real del usuario apenas abre /app, en
    // vez de arrancar siempre en Montevideo -- a diferencia del boton "Usar
    // mi ubicacion" (useGeolocation.ts), esto NO fija origen ni mueve el
    // pickMode: es solo la vista inicial. Silencioso a proposito: si el
    // usuario no dio permiso o no hay ubicacion disponible, se queda con la
    // vista por defecto sin mostrar ningun error -- no lo pidio explicitamente
    // el, es solo una comodidad al entrar.
    if (!navigator.geolocation) return;
    let cancelled = false;
    getCurrentPositionWithFallback(
      (pos) => {
        if (cancelled) return;
        map.setView([pos.coords.latitude, pos.coords.longitude], AUTO_LOCATE_ZOOM);
      },
      () => {
        /* sin permiso o sin ubicacion: se queda con la vista por defecto */
      }
    );
    return () => {
      cancelled = true;
    };
  }, [map]);

  useEffect(() => {
    // Leaflet mide su contenedor una sola vez al montar y no vuelve a
    // hacerlo solo porque el layout de alrededor cambie de tamaño (p. ej.
    // AppTopbar crece cuando se abre el menú móvil, o el bottom sheet del
    // sidebar se expande/colapsa en mobile): sin este aviso explícito, el
    // mapa queda con el tamaño viejo cacheado y los tiles se ven
    // cortados/desplazados hasta el próximo resize real de la ventana.
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

interface MapCanvasProps {
  liveTripPosition: [number, number] | null;
  onMapError: (msg: string | null, severity?: "error" | "warn") => void;
}

export function MapCanvas({ liveTripPosition, onMapError }: MapCanvasProps) {
  return (
    <MapContainer
      center={MONTEVIDEO}
      zoom={13}
      preferCanvas
      zoomControl
      style={{ height: "100%", width: "100%" }}
    >
      <CaptureMap />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <GraphLayer />
      <StationsLayer />
      <OriginDestinationMarkers />
      <RouteLayers />
      <LiveTripMarker position={liveTripPosition} />
      <ClickToPick onError={onMapError} />
    </MapContainer>
  );
}
