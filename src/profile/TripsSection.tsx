import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  getHistory,
  getMonthlyStats,
  getVehicleStats,
  type HistoryEntry,
  type MonthlyStat,
  type VehicleStat,
} from "../api/route";
import { listVehicles, type Vehicle } from "../api/vehicles";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconArrowRight } from "../landing/landingIcons";
import { IconBolt, IconChevronDown } from "../map/panelIcons";
import { CertaintyLine } from "../shared/CertaintyLine";
import { useFormat, type Format } from "../showroom/format";
import { certaintyPointsFromRoute } from "./historyCertainty";
import { LoadError } from "./parts";
import { IconMap, IconNoRoute } from "./profileIcons";
import styles from "./TripsSection.module.css";
import ui from "./ui.module.css";
import { Pumpkin } from "../season/HalloweenDecor";

const HISTORY_PAGE = 10;

/** "2026-10" del mes en curso, en la hora local. */
function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function TripsSection() {
  const { t } = useTranslation();
  const tr = t.profile.trips;
  const history = useQuery({ queryKey: ["history"], queryFn: getHistory });
  const monthly = useQuery({ queryKey: ["monthlyStats"], queryFn: getMonthlyStats });
  const byCar = useQuery({ queryKey: ["vehicleStats"], queryFn: getVehicleStats });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });

  const queries = [history, monthly, byCar];
  const loading = queries.some((q) => q.isPending);
  const failed = queries.some((q) => q.isError);
  const empty = !loading && !failed && !history.data?.length && !monthly.data?.length;

  return (
    <section id="viajes" aria-labelledby="h-viajes" className={styles.section}>
      <div className={styles.headText}>
        <h2 id="h-viajes" className={styles.title}>
          {tr.title}
        </h2>
        <p className={styles.subtitle}>{tr.subtitle}</p>
      </div>

      {loading ? (
        <div role="status" className={styles.loading}>
          <p className={ui.loadingText}>
            <span className={ui.spinner} aria-hidden="true" />
            {tr.loading}
          </p>
          <div className={`${ui.skeleton} ${styles.skeletonBig}`} />
          <div className={`${ui.skeleton} ${styles.skeletonRow}`} />
          <div className={`${ui.skeleton} ${styles.skeletonRow}`} />
        </div>
      ) : failed ? (
        <LoadError
          title={tr.error}
          onRetry={() => queries.forEach((q) => q.isError && void q.refetch())}
        />
      ) : empty ? (
        <div className={styles.empty}>
          <Pumpkin />
          <div className={styles.emptyText}>
            <span className={styles.emptyTitle}>{tr.emptyTitle}</span>
            <span className={styles.emptyBody}>{tr.emptyBody}</span>
          </div>
          <Link to="/app" className={`${ui.outline} ${ui.small}`}>
            {tr.goMap}
            <IconArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <Months stats={monthly.data ?? []} />
            {(byCar.data?.length ?? 0) >= 2 && <ByCar stats={byCar.data!} />}
          </div>
          {(history.data?.length ?? 0) > 0 && (
            <History entries={history.data!} vehicles={vehicles.data ?? []} />
          )}
        </>
      )}
    </section>
  );
}

function monthName(t: ReturnType<typeof useTranslation>["t"], key: string) {
  const [year, month] = key.split("-");
  return `${t.profile.trips.monthsLong[Number(month) - 1]} ${year}`;
}

const orDash = (value: number | null | undefined, show: (v: number) => string) =>
  value == null ? "—" : show(value);

/** El mes en curso con sus tres cifras grandes y, abajo, los anteriores para desplegar. */
function Months({ stats }: { stats: MonthlyStat[] }) {
  const { t, lang } = useTranslation();
  const tr = t.profile.trips;
  const f = useFormat();
  const key = currentMonthKey();
  const sorted = [...stats].sort((a, b) => b.month.localeCompare(a.month));
  const current = sorted.find((m) => m.month === key);
  const previous = sorted.filter((m) => m.month !== key);
  const label = monthName(t, key);

  return (
    <div className={styles.monthCard}>
      <div className={styles.monthNow}>
        <p className={ui.eyebrow}>
          <span className={ui.eyebrowDot} aria-hidden="true" />
          {tr.thisMonth} · {lang === "es" ? label.toLowerCase() : label}
        </p>
        <div className={styles.bigFigures}>
          <div className={styles.bigFigure}>
            <span className={styles.bigValue}>{f.n(current?.trip_count ?? 0)}</span>
            <span className={styles.bigLabel}>{tr.tripsCount(current?.trip_count ?? 0)}</span>
          </div>
          <div className={styles.bigFigure}>
            <span className={styles.bigValue}>
              {f.n(Math.round(current?.total_distance_km ?? 0))}
              <span className={ui.unitSmall}>km</span>
            </span>
            <span className={styles.bigLabel}>{tr.traveled}</span>
          </div>
          <div className={styles.bigFigure}>
            <span className={styles.bigValue}>
              <span className={ui.unitBefore}>$U</span>
              {f.n(Math.round(current?.total_cost_uyu ?? 0))}
            </span>
            <span className={styles.bigLabel}>{tr.spent}</span>
          </div>
        </div>
        <p className={styles.monthLine}>
          {current
            ? tr.monthLine(
                f.n(current.total_energy_kwh ?? 0, 1),
                tr.stops(current.total_recharges),
                f.n(Math.round(current.avg_distance_km ?? 0)),
                f.n(Math.round(current.avg_cost_uyu ?? 0))
              )
            : tr.thisMonthEmpty}
        </p>
      </div>

      {previous.length > 0 && (
        <div className={styles.previous}>
          <span className={styles.previousTitle}>{tr.previous}</span>
          {previous.map((m) => (
            <PreviousMonth key={m.month} stat={m} label={monthName(t, m.month)} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviousMonth({ stat, label, f }: { stat: MonthlyStat; label: string; f: Format }) {
  const { t } = useTranslation();
  const tr = t.profile.trips;
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const km = stat.total_distance_km;
  const cost = stat.total_cost_uyu;
  const perKm = km && cost != null ? cost / km : null;
  const values = [
    f.n(stat.trip_count),
    orDash(km, (v) => `${f.n(Math.round(v))} km`),
    orDash(stat.total_energy_kwh, (v) => `${f.n(v, 1)} kWh`),
    orDash(cost, (v) => `$U ${f.n(Math.round(v))}`),
    f.n(stat.total_recharges),
    orDash(stat.avg_distance_km, (v) => `${f.n(Math.round(v))} km`),
    orDash(stat.avg_cost_uyu, (v) => `$U ${f.n(Math.round(v))}`),
    orDash(perKm, (v) => `$U ${f.n(v, 2)}`),
  ];

  return (
    <div className={styles.month}>
      <button
        type="button"
        className={styles.monthToggle}
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.monthLabel}>{label}</span>
        <span className={styles.monthShort}>
          {stat.trip_count} {tr.tripsCount(stat.trip_count)} ·{" "}
          {orDash(km, (v) => `${f.n(Math.round(v))} km`)} ·{" "}
          {orDash(cost, (v) => `$U ${f.n(Math.round(v))}`)}
        </span>
        <IconChevronDown size={18} />
      </button>
      {open && (
        <dl id={detailId} className={styles.monthDetail}>
          {tr.monthDetail.map((name, i) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{values[i]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Kilómetros de cada auto, con una barra relativa al que más anduvo. */
function ByCar({ stats }: { stats: VehicleStat[] }) {
  const { t } = useTranslation();
  const tr = t.profile.trips;
  const f = useFormat();
  const max = Math.max(...stats.map((s) => s.total_distance_km ?? 0), 1);

  return (
    <div className={styles.byCar}>
      <h3 className={styles.cardTitle}>{tr.byCar}</h3>
      <ul className={styles.byCarList}>
        {stats.map((s) => {
          const km = s.total_distance_km ?? 0;
          // Con dos decimales: redondeado a pesos, $U 1,45 salía como "$ 1".
          const perKm =
            s.cost_uyu_per_km ?? (km && s.total_cost_uyu != null ? s.total_cost_uyu / km : null);
          return (
            <li key={s.vehicle_name} className={styles.byCarItem}>
              <span className={styles.byCarHead}>
                <span className={styles.byCarName}>{s.vehicle_name}</span>
                <span className={styles.byCarKm}>
                  {f.n(Math.round(km))}
                  <span>km</span>
                </span>
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${(km / max) * 100}%` }} />
              </span>
              <span className={styles.byCarLine}>
                {tr.byCarLine(
                  `${s.trip_count} ${tr.tripsCount(s.trip_count)}`,
                  orDash(s.total_energy_kwh, (v) => f.n(v, 1)),
                  orDash(s.total_cost_uyu, (v) => f.n(Math.round(v))),
                  orDash(perKm, (v) => f.n(v, 2))
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function History({ entries, vehicles }: { entries: HistoryEntry[]; vehicles: Vehicle[] }) {
  const { t } = useTranslation();
  const tr = t.profile.trips;
  const [all, setAll] = useState(false);
  const sorted = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const shown = all ? sorted : sorted.slice(0, HISTORY_PAGE);

  return (
    <div className={styles.history}>
      <div className={styles.historyHead}>
        <h3 className={styles.cardTitle}>{tr.history}</h3>
        <span className={styles.historyCount}>{tr.historyCount(entries.length)}</span>
      </div>
      <ul className={styles.historyList}>
        {shown.map((entry, i) => (
          <Trip
            key={entry.id ?? i}
            entry={entry}
            vehicle={vehicles.find((v) => v.id === entry.vehicle_id)}
          />
        ))}
      </ul>
      {!all && sorted.length > HISTORY_PAGE && (
        <button
          type="button"
          className={`${ui.outline} ${ui.small} ${styles.more}`}
          onClick={() => setAll(true)}
        >
          {tr.showMore}
        </button>
      )}
    </div>
  );
}

function Trip({ entry, vehicle }: { entry: HistoryEntry; vehicle: Vehicle | undefined }) {
  const { t, lang } = useTranslation();
  const tr = t.profile.trips;
  const f = useFormat();

  const date = new Date(entry.created_at);
  const month = tr.monthsShort[date.getMonth()];
  const day = lang === "es" ? `${date.getDate()} ${month}` : `${month} ${date.getDate()}`;
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const from = entry.origin_name || String(entry.origin_id ?? "");
  const to = entry.destination_name || String(entry.destination_id ?? "");
  const noRoute = entry.distance_km == null;

  const capacity = vehicle?.battery_capacity_kwh ?? null;
  const startPct =
    capacity && entry.start_battery_kwh != null
      ? Math.round((entry.start_battery_kwh / capacity) * 100)
      : null;
  const meta = [vehicle?.name, startPct != null ? tr.leftWith(startPct) : null]
    .filter(Boolean)
    .join(" · ");
  const points =
    entry.result?.astar && capacity && entry.start_battery_kwh != null
      ? certaintyPointsFromRoute(entry.result.astar, entry.start_battery_kwh, capacity)
      : [];
  const endPct = points.length ? Math.round(points[points.length - 1]!.batteryPct) : null;

  const minutes = entry.trip_time_min;
  const hours = minutes != null ? Math.floor(minutes / 60) : 0;

  return (
    <li className={styles.trip}>
      <span className={styles.tripDate}>
        <span className={styles.tripDay}>{day}</span>
        <span className={styles.tripTime}>{time}</span>
      </span>
      <span className={styles.tripRoute}>
        <span className={styles.tripPlaces}>
          <span>{from}</span>
          <IconArrowRight size={16} />
          <span className="sr-only">{tr.to}</span>
          <span>{to}</span>
        </span>
        {meta && <span className={styles.tripMeta}>{meta}</span>}
      </span>

      {noRoute ? (
        <span className={styles.tripFail}>
          <span className={styles.chipDanger}>
            <IconNoRoute />
            {tr.noRoute}
          </span>
          <span className={styles.tripFailBody}>{tr.noRouteBody}</span>
        </span>
      ) : (
        <>
          <span className={styles.tripFigures}>
            <span className={styles.figure}>
              {f.n(Math.round(entry.distance_km!))}
              <span className={styles.figureUnit}>km</span>
            </span>
            {minutes != null && (
              <span className={styles.figure}>
                {hours > 0 ? (
                  <>
                    {hours}
                    <span className={styles.figureHour}>h</span>
                    {String(Math.round(minutes) % 60).padStart(2, "0")}
                  </>
                ) : (
                  <>
                    {Math.round(minutes)}
                    <span className={styles.figureUnit}> min</span>
                  </>
                )}
              </span>
            )}
            {entry.costo_uyu_total != null && (
              <span className={styles.figure}>
                <span className={styles.figureUnitBefore}>$U</span>
                {f.n(Math.round(entry.costo_uyu_total))}
              </span>
            )}
            {entry.recharge_count > 0 ? (
              <span className={styles.chipWarn}>
                <IconBolt size={13} />
                {tr.stops(entry.recharge_count)}
              </span>
            ) : (
              <span className={styles.noStops}>{tr.noStops}</span>
            )}
          </span>
          {points.length >= 2 && startPct != null && endPct != null && (
            <span className={styles.spark}>
              <CertaintyLine points={points} scale="micro" ariaLabel={tr.spark(startPct, endPct)} />
            </span>
          )}
          {/* Un link de verdad: /app busca el viaje por id (ver
              useReplayFromHistory), así se puede abrir en otra pestaña. */}
          {entry.id != null && (
            <Link
              to={`/app?viaje=${entry.id}`}
              className={`${ui.outline} ${ui.small} ${styles.view}`}
              aria-label={tr.viewMapLabel(from, to)}
            >
              <IconMap />
              {tr.viewMap}
            </Link>
          )}
        </>
      )}
    </li>
  );
}
