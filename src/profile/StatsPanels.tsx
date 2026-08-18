import { useQuery } from "@tanstack/react-query";
import { getMonthlyStats, getVehicleStats } from "../api/route";
import { formatUyu } from "../shared/format";
import { useTranslation } from "../i18n/LanguageProvider";
import { fmt } from "./formatCell";
import styles from "./ProfilePage.module.css";

function formatMonth(yyyyMm: string, monthNames: string[]): string {
  const [year, month] = yyyyMm.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

export function MonthlyStatsPanel() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["monthlyStats"], queryFn: getMonthlyStats });
  const stats = query.data ?? [];

  return (
    <section className="panel">
      <h2>{t.profile.stats.monthlyTitle}</h2>
      <p className="hint">{t.profile.stats.monthlyHint}</p>
      {query.isSuccess && stats.length === 0 ? (
        <p className="hint">{t.profile.stats.monthlyEmpty}</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.profile.stats.colMonth}</th>
                <th>{t.profile.stats.colTrips}</th>
                <th>{t.profile.stats.colTotalDistance}</th>
                <th>{t.profile.stats.colTotalEnergy}</th>
                <th>{t.profile.stats.colTotalCost}</th>
                <th>{t.profile.stats.colRecharges}</th>
                <th>{t.profile.stats.colAvgDistance}</th>
                <th>{t.profile.stats.colAvgCost}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((m) => (
                <tr key={m.month}>
                  <td>{formatMonth(m.month, t.profile.stats.monthNames)}</td>
                  <td>{m.trip_count}</td>
                  <td>{fmt(m.total_distance_km, 1, " km")}</td>
                  <td>{fmt(m.total_energy_kwh, 1, " kWh")}</td>
                  <td className={styles.cellTotal}>{m.total_cost_uyu == null ? "-" : formatUyu(m.total_cost_uyu)}</td>
                  <td>{m.total_recharges || 0}</td>
                  <td>{fmt(m.avg_distance_km, 1, " km")}</td>
                  <td>{m.avg_cost_uyu == null ? "-" : formatUyu(m.avg_cost_uyu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function VehicleStatsPanel() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["vehicleStats"], queryFn: getVehicleStats });
  const stats = query.data ?? [];

  // Con un solo vehículo esta tabla repite lo que ya dice la mensual: cada
  // fila sería el total del mes entero. Solo aporta desde el segundo auto.
  if (stats.length < 2) return null;

  return (
    <section className="panel">
      <h2>{t.profile.stats.vehicleTitle}</h2>
      <p className="hint">{t.profile.stats.vehicleHint}</p>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.profile.stats.colVehicle}</th>
              <th>{t.profile.stats.colTrips}</th>
              <th>{t.profile.stats.colDistance}</th>
              <th>{t.profile.stats.colEnergy}</th>
              <th>{t.profile.stats.colCost}</th>
              <th>{t.profile.stats.colCostPerKm}</th>
              <th>{t.profile.stats.colRecharges}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((v) => (
              <tr key={v.vehicle_name}>
                <td className={styles.cellVehicle}>{v.vehicle_name}</td>
                <td>{v.trip_count}</td>
                <td>{fmt(v.total_distance_km, 1, " km")}</td>
                <td>{fmt(v.total_energy_kwh, 1, " kWh")}</td>
                <td className={styles.cellTotal}>{v.total_cost_uyu == null ? "-" : formatUyu(v.total_cost_uyu)}</td>
                <td>{v.cost_uyu_per_km == null ? "-" : `${formatUyu(v.cost_uyu_per_km)} /km`}</td>
                <td>{v.total_recharges || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
