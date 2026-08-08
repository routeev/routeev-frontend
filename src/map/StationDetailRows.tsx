import type { Station } from "../api/graph";
import styles from "./layers/StationPopup.module.css";

/** Filas de detalle de una estación, compartidas por el popup del mapa y el panel lateral (js/map/graphData.js#stationDetailHtml). */
export function StationDetailRows({ station }: { station: Station }) {
  const conectores = station.conectores?.length ? station.conectores : null;
  return (
    <div className={styles.detail}>
      <div className={styles.row}>
        <span>Dirección</span>
        <b>{station.direccion}</b>
      </div>
      {station.departamento && (
        <div className={styles.row}>
          <span>Departamento</span>
          <b>{station.departamento}</b>
        </div>
      )}
      {conectores ? (
        conectores.map((c, i) => (
          <div className={styles.row} key={i}>
            <span>
              {c.tipo}
              {c.con_cable === false ? " (sin cable)" : ""}
            </span>
            <b>
              {c.potencia_kw} kW × {c.cantidad}
            </b>
          </div>
        ))
      ) : (
        <div className={styles.row}>
          <span>Conector</span>
          <b>
            {station.tipo_conector} · {station.potencia_kw} kW
          </b>
        </div>
      )}
      <div className={styles.row}>
        <span>Operador</span>
        <b>{station.operador}</b>
      </div>
      <div className={styles.row}>
        <span>Coordenadas</span>
        <b>
          {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
        </b>
      </div>
      <div className={styles.note}>{station.nota}</div>
    </div>
  );
}
