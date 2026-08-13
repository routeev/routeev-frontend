import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listStationReviewSummaries } from "../api/stationReviews";
import { RatingSummary } from "./RatingSummary";
import { StationDetailRows } from "./StationDetailRows";
import { StationReviews } from "./StationReviews";
import { useMapStore } from "./mapStore";
import styles from "./StationsPanel.module.css";

const BOLT_SVG_PATH = "M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z";

export function StationsPanel() {
  const stations = useMapStore((s) => s.stations);
  const leafletMap = useMapStore((s) => s.leafletMap);
  const selectStation = useMapStore((s) => s.selectStation);
  const [openId, setOpenId] = useState<number | null>(null);
  const summariesQuery = useQuery({ queryKey: ["stationReviewSummaries"], queryFn: listStationReviewSummaries });

  return (
    <section className="panel" id="stations-panel">
      <h2>Estaciones de carga</h2>
      <ul className={openId != null ? `${styles.list} ${styles.open}` : styles.list}>
        {stations.map((st) => {
          const open = openId === st.node_id;
          const nodeId = String(st.node_id);
          return (
            <li key={st.node_id}>
              <button
                type="button"
                className={styles.header}
                onClick={() => {
                  const next = open ? null : st.node_id;
                  setOpenId(next);
                  selectStation(next);
                  if (next) leafletMap?.setView([st.lat, st.lon], 16);
                }}
              >
                <span className={styles.name}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={BOLT_SVG_PATH} />
                  </svg>
                  {st.nombre}
                </span>
                <span className={styles.meta}>
                  <RatingSummary summary={summariesQuery.data?.[nodeId]} size={11} compact />
                  <span className={styles.power}>{st.potencia_kw} kW</span>
                </span>
              </button>
              {open && (
                <>
                  <StationDetailRows station={st} />
                  <StationReviews nodeId={nodeId} />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
