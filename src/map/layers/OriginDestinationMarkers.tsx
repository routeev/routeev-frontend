import { Marker, Popup } from "react-leaflet";
import { destinationIcon, originIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

export function OriginDestinationMarkers() {
  const originNode = useMapStore((s) => s.originNode);
  const destinationNode = useMapStore((s) => s.destinationNode);

  return (
    <>
      {originNode && (
        <Marker position={[originNode.lat, originNode.lon]} icon={originIcon()} zIndexOffset={500}>
          <Popup>
            <b>Origen</b>
            <br />
            {originNode.name}
          </Popup>
        </Marker>
      )}
      {destinationNode && (
        <Marker
          position={[destinationNode.lat, destinationNode.lon]}
          icon={destinationIcon()}
          zIndexOffset={500}
        >
          <Popup>
            <b>Destino</b>
            <br />
            {destinationNode.name}
          </Popup>
        </Marker>
      )}
    </>
  );
}
