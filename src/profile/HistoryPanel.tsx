import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getHistory, type HistoryEntry } from "../api/route";
import { listVehicles } from "../api/vehicles";
import { CertaintyLine } from "../shared/CertaintyLine";
import { formatDate, formatDuration, formatUyu } from "../shared/format";
import { useTranslation } from "../i18n/LanguageProvider";
import { certaintyPointsFromRoute } from "./historyCertainty";
import { fmt } from "./formatCell";
import styles from "./ProfilePage.module.css";

function HistoryRow({ entry, capacityKwh }: { entry: HistoryEntry; capacityKwh: number | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const noRoute = entry.distance_km === null || entry.distance_km === undefined;
  const astar = entry.result?.astar;

  // Escala "micro" del elemento de firma (front2.md 3.4): el mismo perfil de
  // batería que el dashboard muestra en grande, acá como glifo de una fila.
  const points =
    astar && capacityKwh && entry.start_battery_kwh != null
      ? certaintyPointsFromRoute(astar, entry.start_battery_kwh, capacityKwh)
      : [];

  return (
    <tr>
      <td>{formatDate(entry.created_at)}</td>
      <td className={styles.cellRoute}>
        {entry.origin_name || entry.origin_id} → {entry.destination_name || entry.destination_id}
      </td>
      <td className={styles.cellProfile}>{points.length >= 2 && <CertaintyLine points={points} scale="micro" />}</td>
      <td className={noRoute ? styles.cellDanger : undefined}>{noRoute ? t.profile.history.noRoute : fmt(entry.distance_km, 1, " km")}</td>
      <td>{fmt(entry.energy_kwh, 2, " kWh")}</td>
      <td>{entry.trip_time_min == null ? "-" : formatDuration(entry.trip_time_min)}</td>
      <td>{entry.costo_uyu_total == null ? "-" : formatUyu(entry.costo_uyu_total)}</td>
      <td className={entry.recharge_count ? styles.cellRecharge : undefined}>{entry.recharge_count || 0}</td>
      <td>
        {!noRoute && (
          <button
            type="button"
            className="primary small"
            onClick={() => {
              // Mismo puente que js/profile.js: el resultado completo ya está
              // guardado, así que /app lo redibuja sin volver a pedir la ruta.
              sessionStorage.setItem("routeev_replay_trip", JSON.stringify(entry));
              navigate("/app?replay=1");
            }}
          >
            {t.profile.history.view}
          </button>
        )}
      </td>
    </tr>
  );
}

export function HistoryPanel() {
  const { t } = useTranslation();
  const historyQuery = useQuery({ queryKey: ["history"], queryFn: getHistory });
  const vehiclesQuery = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const history = historyQuery.data ?? [];

  function capacityFor(vehicleId: number): number | null {
    return vehiclesQuery.data?.find((v) => v.id === vehicleId)?.battery_capacity_kwh ?? null;
  }

  return (
    <section className="panel">
      <h2>{t.profile.history.title}</h2>
      {historyQuery.isSuccess && history.length === 0 ? (
        <p className="hint">{t.profile.history.emptyState}</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.profile.history.colDate}</th>
                <th>{t.profile.history.colRoute}</th>
                <th>{t.profile.history.colBattery}</th>
                <th>{t.profile.history.colDistance}</th>
                <th>{t.profile.history.colEnergy}</th>
                <th>{t.profile.history.colTime}</th>
                <th>{t.profile.history.colCost}</th>
                <th>{t.profile.history.colRecharges}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <HistoryRow key={entry.id ?? i} entry={entry} capacityKwh={capacityFor(entry.vehicle_id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
