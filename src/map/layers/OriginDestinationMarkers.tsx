import { Marker, Popup } from "react-leaflet";
import { useTranslation } from "../../i18n/LanguageProvider";
import { destinationIcon, originIcon, stopIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

export function OriginDestinationMarkers() {
  const { t } = useTranslation();
  const om = t.map.layers.originDestinationMarkers;
  const originNode = useMapStore((s) => s.originNode);
  const destinationNode = useMapStore((s) => s.destinationNode);
  const paradas = useMapStore((s) => s.paradas);

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
      {paradas.map((p, i) =>
        p.point ? (
          <Marker key={p.key} position={[p.point.lat, p.point.lon]} icon={stopIcon(i + 1)} zIndexOffset={400}>
            <Popup>
              <b>{om.stop(i + 1)}</b>
              <br />
              {p.point.name}
            </Popup>
          </Marker>
        ) : null
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
