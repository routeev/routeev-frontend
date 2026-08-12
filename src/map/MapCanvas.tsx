import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { ClickToPick } from "./layers/ClickToPick";
import { GraphLayer } from "./layers/GraphLayer";
import { LiveTripMarker } from "./layers/LiveTripMarker";
import { OriginDestinationMarkers } from "./layers/OriginDestinationMarkers";
import { RouteLayers } from "./layers/RouteLayers";
import { StationsLayer } from "./layers/StationsLayer";
import { myLocationIcon } from "./markerIcons";
import { getCurrentPositionWithFallback } from "./useGeolocation";
import { useMapStore } from "./mapStore";

const MONTEVIDEO: [number, number] = [-34.89, -56.16];
const AUTO_LOCATE_ZOOM = 15;

interface CaptureMapProps {
  onLocateFail: (msg: string) => void;
}

function CaptureMap({ onLocateFail }: CaptureMapProps) {
  const map = useMap();
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);

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
    // pickMode: es solo la vista inicial. Si falla (permiso denegado, sin
    // GPS/ubicacion del dispositivo, etc.) se queda con la vista por
    // defecto -- pero SI avisa por que, con el mismo banner que usa
    // ClickToPick (variant "warn", no bloquea nada): en la practica el caso
    // mas comun es el permiso del navegador nunca llega a preguntarse
    // porque la ubicacion esta apagada a nivel sistema operativo, y sin
    // este aviso no hay forma de que el usuario se entere de que existe
    // ese paso a revisar.
    if (!navigator.geolocation) return;
    let cancelled = false;
    getCurrentPositionWithFallback(
      (pos) => {
        if (cancelled) return;
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        map.setView(coords, AUTO_LOCATE_ZOOM);
        setMyPosition(coords);
      },
      (err) => {
        if (cancelled) return;
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "no diste permiso de ubicación (o está apagada en el dispositivo/sistema)"
            : "no se pudo determinar tu ubicación";
        onLocateFail(
          `No pudimos centrar el mapa en tu ubicación: ${reason}. Mostrando Uruguay entero.`
        );
      }
    );
    return () => {
      cancelled = true;
    };
  }, [map, onLocateFail]);

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

  if (!myPosition) return null;
  return (
    <Marker position={myPosition} icon={myLocationIcon()} zIndexOffset={400} interactive={false} />
  );
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
      <CaptureMap onLocateFail={(msg) => onMapError(msg, "warn")} />
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
