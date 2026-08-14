import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { ClickToPick } from "./layers/ClickToPick";
import { GraphLayer } from "./layers/GraphLayer";
import { LiveTripMarker } from "./layers/LiveTripMarker";
import { OriginDestinationMarkers } from "./layers/OriginDestinationMarkers";
import { RouteLayers } from "./layers/RouteLayers";
import { StationsLayer } from "./layers/StationsLayer";
import { AUTO_LOCATE_ZOOM } from "./mapConstants";
import { myLocationIcon } from "./markerIcons";
import { getCurrentPositionWithFallback } from "./useGeolocation";
import { useMapStore } from "./mapStore";

const MONTEVIDEO: [number, number] = [-34.89, -56.16];

interface CaptureMapProps {
  onLocateFail: (msg: string) => void;
}

function CaptureMap({ onLocateFail }: CaptureMapProps) {
  const map = useMap();
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  // MapCanvas pasa un `(msg) => onMapError(msg, "warn")` inline como
  // onLocateFail: una funcion nueva en CADA render de MapPage/MapCanvas
  // (ninguno de los dos memoiza). Si el efecto de auto-locate de abajo
  // dependiera de ese valor directamente, un solo fallo de geolocalizacion
  // dispara onLocateFail -> setMapBanner en MapPage -> re-render -> nueva
  // identidad de onLocateFail -> el efecto se vuelve a correr -> nuevo
  // intento de geolocalizacion -> nuevo fallo -> bucle infinito (medido:
  // ~1700 pedidos de ubicacion en el tiempo de un solo click). El ref
  // siempre apunta a la version mas nueva sin forzar al efecto a
  // re-ejecutarse por eso.
  const onLocateFailRef = useRef(onLocateFail);
  onLocateFailRef.current = onLocateFail;

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
        // Tambien al store, no solo al estado local: es lo que le permite a
        // StationDetailPanel volver a centrar aca al salir del detalle de
        // una estacion, sin que ese componente tenga que ser descendiente
        // de CaptureMap.
        useMapStore.getState().setMyPosition(coords);
      },
      (err) => {
        if (cancelled) return;
        // Mismo nivel de detalle que ERROR_MESSAGES en useGeolocation.ts (el
        // boton "Usar mi ubicacion"): el mensaje generico de antes ("no
        // diste permiso...") no le daba a nadie un paso concreto para
        // arreglarlo. PERMISSION_DENIED en el navegador casi siempre es una
        // decision YA GUARDADA de una vez anterior (por eso nunca vuelve a
        // preguntar) -- el candado en la barra de direcciones es el unico
        // lugar para revertirla.
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "no le diste permiso de ubicación a este sitio, o quedó bloqueado de una visita anterior. Para habilitarlo: tocá el candado 🔒 junto a la dirección del sitio y activá la ubicación (o revisá que la ubicación esté encendida en el dispositivo)"
            : "no se pudo determinar tu ubicación (revisá que el GPS o la ubicación del dispositivo estén encendidos)";
        onLocateFailRef.current(`No pudimos centrar el mapa en tu ubicación: ${reason}. Mostrando Uruguay entero.`);
      }
    );
    return () => {
      cancelled = true;
    };
    // Solo [map]: ver el comentario de onLocateFailRef arriba.
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
