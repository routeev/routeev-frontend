import { useQuery } from "@tanstack/react-query";
import { getMonthlyStats, getVehicleStats } from "../api/route";
import { formatUyu } from "../shared/format";
import { fmt } from "./formatCell";
import styles from "./ProfilePage.module.css";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function MonthlyStatsPanel() {
  const query = useQuery({ queryKey: ["monthlyStats"], queryFn: getMonthlyStats });
  const stats = query.data ?? [];

  return (
    <section className="panel">
      <h2>Consumo y gasto por mes</h2>
      <p className="hint">Sobre los viajes efectivamente recorridos, agrupados por mes.</p>
      {query.isSuccess && stats.length === 0 ? (
        <p className="hint">Todavía no hay viajes calculados este mes ni en meses anteriores.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Viajes</th>
                <th>Distancia total</th>
                <th>Energía total</th>
                <th>Gasto total</th>
                <th>Recargas</th>
                <th>Distancia prom.</th>
                <th>Costo prom.</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((m) => (
                <tr key={m.month}>
                  <td>{formatMonth(m.month)}</td>
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
  const query = useQuery({ queryKey: ["vehicleStats"], queryFn: getVehicleStats });
  const stats = query.data ?? [];

  // Con un solo vehículo esta tabla repite lo que ya dice la mensual: cada
  // fila sería el total del mes entero. Solo aporta desde el segundo auto.
  if (stats.length < 2) return null;

  return (
    <section className="panel">
      <h2>Consumo por vehículo</h2>
      <p className="hint">Acumulado histórico de cada vehículo, ordenado por kilómetros recorridos.</p>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Viajes</th>
              <th>Distancia</th>
              <th>Energía</th>
              <th>Gasto</th>
              <th>Costo / km</th>
              <th>Recargas</th>
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
