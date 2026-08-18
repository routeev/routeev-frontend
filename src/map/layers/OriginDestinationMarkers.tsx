import { Marker, Popup } from "react-leaflet";
import { useTranslation } from "../../i18n/LanguageProvider";
import { destinationIcon, originIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

export function OriginDestinationMarkers() {
  const { t } = useTranslation();
  const om = t.map.layers.originDestinationMarkers;
  const originNode = useMapStore((s) => s.originNode);
  const destinationNode = useMapStore((s) => s.destinationNode);

  return (
    <>
      {originNode && (
        <Marker position={[originNode.lat, originNode.lon]} icon={originIcon()} zIndexOffset={500}>
          <Popup>
            <b>{om.origin}</b>
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
            <b>{om.destination}</b>
            <br />
            {destinationNode.name}
          </Popup>
        </Marker>
      )}
    </>
  );
}
