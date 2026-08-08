import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { ClickToPick } from "./layers/ClickToPick";
import { GraphLayer } from "./layers/GraphLayer";
import { LiveTripMarker } from "./layers/LiveTripMarker";
import { OriginDestinationMarkers } from "./layers/OriginDestinationMarkers";
import { RouteLayers } from "./layers/RouteLayers";
import { StationsLayer } from "./layers/StationsLayer";
import { useMapStore } from "./mapStore";

const MONTEVIDEO: [number, number] = [-34.89, -56.16];

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
  return null;
}

interface MapCanvasProps {
  liveTripPosition: [number, number] | null;
  onMapError: (msg: string) => void;
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
