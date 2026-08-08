import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Marker, Popup } from "react-leaflet";
import { getStations } from "../../api/graph";
import { StationDetailRows } from "../StationDetailRows";
import { stationIcon } from "../markerIcons";
import { useMapStore } from "../mapStore";

export function StationsLayer() {
  const query = useQuery({ queryKey: ["stations"], queryFn: getStations });
  const setStations = useMapStore((s) => s.setStations);

  useEffect(() => {
    if (query.data) setStations(query.data);
  }, [query.data, setStations]);

  if (!query.data) return null;

  return (
    <>
      {query.data.map((st) => (
        <Marker key={st.node_id} position={[st.lat, st.lon]} icon={stationIcon()}>
          <Popup>
            <b>{st.nombre}</b>
            <br />
            <StationDetailRows station={st} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}
