import { Marker } from "react-leaflet";
import { liveLocationIcon } from "../markerIcons";

export function LiveTripMarker({ position }: { position: [number, number] | null }) {
  if (!position) return null;
  return <Marker position={position} icon={liveLocationIcon()} zIndexOffset={1000} />;
}
