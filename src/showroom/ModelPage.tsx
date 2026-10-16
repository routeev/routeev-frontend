import { useQuery } from "@tanstack/react-query";
import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { showroomModel, type ShowroomMetrics, type ShowroomModel } from "../api/showroom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconRoute, IconCheck, IconRetry } from "../map/panelIcons";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { useMediaQuery } from "../shared/useMediaQuery";
import type { CatalogLine } from "./catalog";
import { useFormat, type Format } from "./format";
import { formatPriceDate } from "./formatPriceDate";
import { CarOutline, IconExternal } from "./showroomIcons";
import { TripSimulator } from "./TripSimulator";
import { useModelPhoto } from "./useModelPhoto";
import styles from "./ModelPage.module.css";
import ui from "./ui.module.css";

interface ModelPageProps {
  line: CatalogLine;
  loggedIn: boolean;
}

/**
 * La ficha de un modelo, /showroom/<marca>/<modelo>. Las cifras del auto
 * salen del catálogo (ya bajado) y se ven al instante; costos y tiempos de
 * carga llegan aparte, con la ficha de la versión elegida.
 */
export function ModelPage({ line, loggedIn }: ModelPageProps) {
  const { t, lang } = useTranslation();
  const tm = t.showroom.model;
  const f = useFormat();
  const [searchParams, setSearchParams] = useSearchParams();
  const model = line.versions.find((v) => v.id === searchParams.get("v")) ?? line.main;
  const simRef = useRef<HTMLElement>(null);

  const ficha = useQuery({
    queryKey: ["showroomModel", model.id],
    queryFn: () => showroomModel(model.id),
  });
  const metricas = ficha.data?.metricas;

  // La foto de esta versión si tiene una propia; si no, la del modelo.
  const own = model.foto_url ? { url: model.foto_url, credito: model.foto_credito } : undefined;
  const { ref: photoRef, photo } = useModelPhoto(
    `${line.brand} ${line.name}`,
    true,
    own ?? line.photo
  );
  const found = photo?.encontrada && photo.url ? photo : null;

  function selectVersion(id: string) {
    // replace: cambiar de versión no es un paso para el botón "atrás".
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === line.main.id) next.delete("v");
        else next.set("v", id);
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  }

  function goToSimulator(e: MouseEvent) {
    e.preventDefault();
    const section = simRef.current;
    if (!section) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }

  const homologada = model.autonomia_homologada_km;

  return (
    <article aria-labelledby="h-model" className={styles.page}>
      <div className={styles.top}>
        <figure className={styles.figure}>
          <div className={styles.photoBox} ref={photoRef}>
            {found ? (
              <img
                className={styles.photo}
                src={cloudinaryResize(found.url, 800)}
                alt={`${line.brand} ${line.name}`}
                decoding="async"
              />
            ) : (
              photo && (
                <span className={styles.noPhoto}>
                  <CarOutline width={120} />
                  <span>{tm.noPhoto}</span>
                </span>
              )
            )}
          </div>
          {found && (
            <figcaption className={styles.credit}>
              <span>
                {tm.photo}
                {found.credito?.autor ? `: ${found.credito.autor}` : ""}
              </span>
              {found.credito?.licencia && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{found.credito.licencia}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <a
                href={found.credito?.archivo_url ?? "https://commons.wikimedia.org/"}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.creditLink}
              >
                Wikimedia Commons
                <IconExternal />
              </a>
            </figcaption>
          )}
        </figure>

        <div className={styles.info}>
          <div className={styles.titles}>
            <Link to={`/showroom/${line.brandSlug}`} className={styles.brandLink}>
              {line.brand}
            </Link>
            <h1 id="h-model" className={styles.title}>
              {line.brand} {line.name}
            </h1>
            {line.aliases.length > 0 && (
              <p className={styles.alias}>
                {tm.alsoKnown(
                  new Intl.ListFormat(lang, { type: "disjunction" }).format(line.aliases)
                )}
              </p>
            )}
          </div>

          {line.versions.length > 1 && (
            <VersionPicker line={line} selected={model} onSelect={selectVersion} f={f} />
          )}

          <div className={styles.statsBlock}>
            <dl className={styles.stats}>
              <div className={styles.statBig}>
                <dt>{tm.statRange}</dt>
                <dd className={styles.bigNum}>
                  {f.n(model.autonomia_aprox_km)}
                  <span className={ui.unit}>km</span>
                </dd>
                {homologada && homologada !== model.autonomia_aprox_km ? (
                  <dd className={styles.statSub}>{tm.maker(f.n(homologada))}</dd>
                ) : null}
              </div>
              <div className={styles.statBig}>
                <dt>{tm.statBattery}</dt>
                <dd className={styles.bigNum}>
                  {f.n(model.bateria_kwh, 1)}
                  <span className={ui.unit}>kWh</span>
                </dd>
              </div>
              <div className={styles.stat}>
                <dt>{tm.statConsumption}</dt>
                <dd className={styles.midNum}>
                  {f.n(model.consumo_kwh_km * 100, 1)}
                  <span className={ui.unit}>kWh/100 km</span>
                </dd>
              </div>
              <div className={styles.stat}>
                <dt>{tm.statCharge}</dt>
                <dd className={styles.midNum}>
                  {f.n(model.potencia_carga_kw)}
                  <span className={ui.unit}>kW</span>
                </dd>
              </div>
            </dl>
            <p className={styles.note}>{tm.realNote}</p>
          </div>

          <div className={styles.costsBlock}>
            <div className={styles.costs}>
              <Cost label={tm.cost100} value={metricas?.costo_uyu_100km} f={f} />
              <Cost label={tm.costFull} value={metricas?.costo_carga_completa_uyu} f={f} />
            </div>
            {metricas ? (
              <p className={styles.note}>{tm.costNote(f.n(metricas.energia_uyu_kwh, 2))}</p>
            ) : ficha.isError ? (
              <MetricsError onRetry={() => void ficha.refetch()} />
            ) : (
              <p className="sr-only" role="status">
                {tm.metricsLoading}
              </p>
            )}
          </div>

          <div className={styles.ctas}>
            <a href="#simular" className={styles.ctaSim} onClick={goToSimulator}>
              <IconRoute />
              {tm.ctaSimulate}
            </a>
            {loggedIn && (
              <Link to="/app" className={styles.ctaApp}>
                {tm.ctaApp}
              </Link>
            )}
          </div>
          <span className={styles.source}>{model.fuente === "ia" ? tm.sourceAi : tm.source}</span>
        </div>
      </div>

      {model.precio_uy && (
        <section aria-labelledby="h-imesi" className={styles.imesi}>
          <h2 id="h-imesi" className={styles.imesiTitle}>
            {tm.imesiTitle}
          </h2>
          <dl className={styles.imesiFigures}>
            <div>
              <dt>{tm.listPrice}</dt>
              <dd>
                <span className={ui.prefix}>USD</span>
                {f.n(model.precio_uy.precio_usd)}
              </dd>
            </div>
            <div>
              {model.precio_uy.imesi_2027.tramo === "exento" ? (
                <>
                  <dt>{tm.imesiEstimated(0)}</dt>
                  <dd>{tm.imesiExempt}</dd>
                </>
              ) : (
                <>
                  <dt>{tm.imesiEstimated(model.precio_uy.imesi_2027.porcentaje_2027)}</dt>
                  <dd>
                    <span className={ui.prefix}>USD</span>
                    {f.n(
                      (model.precio_uy.precio_usd * model.precio_uy.imesi_2027.porcentaje_2027) /
                        100
                    )}
                  </dd>
                </>
              )}
            </div>
          </dl>
          <p className={styles.imesiNote}>
            {tm.imesiNote(formatPriceDate(model.precio_uy.verificado_el, lang))}
          </p>
        </section>
      )}

      <ChargingSection metricas={metricas} isError={ficha.isError} f={f} />

      <section id="simular" ref={simRef} aria-labelledby="h-sim" className={styles.sim}>
        <div className={styles.simHead}>
          <h2 id="h-sim" className={styles.simTitle} tabIndex={-1}>
            {t.showroom.simulationForm.title}
          </h2>
          <p className={styles.simBody}>{t.showroom.simulationForm.body}</p>
        </div>
        <TripSimulator line={line} model={model} />
      </section>
    </article>
  );
}

function Cost({ label, value, f }: { label: string; value: number | undefined; f: Format }) {
  return (
    <div className={styles.cost}>
      <span className={styles.costLabel}>{label}</span>
      {value != null ? (
        <span className={styles.costValue}>
          <span className={ui.prefix}>$U</span>
          {f.n(value)}
        </span>
      ) : (
        <span className={styles.costSkeleton} aria-hidden="true" />
      )}
    </div>
  );
}

function MetricsError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <p role="alert" className={styles.metricsError}>
      {t.showroom.model.metricsError}
      <button type="button" className={styles.metricsRetry} onClick={onRetry}>
        <IconRetry size={16} />
        {t.showroom.model.retry}
      </button>
    </p>
  );
}

interface VersionPickerProps {
  line: CatalogLine;
  selected: ShowroomModel;
  onSelect: (id: string) => void;
  f: Format;
}

/** Las versiones como radios: la elegida con borde menta y tilde. Flechas para moverse. */
function VersionPicker({ line, selected, onSelect, f }: VersionPickerProps) {
  const { t } = useTranslation();
  const tm = t.showroom.model;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const versions = line.versions;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + versions.length) % versions.length;
    onSelect(versions[next]!.id);
    refs.current[next]?.focus();
  }

  return (
    <div className={styles.versions}>
      <span id="ver-l" className={styles.versionsLabel}>
        {tm.versionsTitle(versions.length)}
      </span>
      <div role="radiogroup" aria-labelledby="ver-l" className={styles.versionRow}>
        {versions.map((v, i) => {
          const on = v.id === selected.id;
          return (
            <button
              key={v.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={styles.version}
              onClick={() => onSelect(v.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className={styles.versionName}>
                {on && <IconCheck size={14} strokeWidth={2.2} />}
                {v.version?.trim() || tm.baseVersion}
              </span>
              <span className={styles.versionSub}>
                {f.n(v.bateria_kwh, 1)} kWh · {f.n(v.autonomia_aprox_km)} km
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ChargingSectionProps {
  metricas: ShowroomMetrics | undefined;
  isError: boolean;
  f: Format;
}

/** Cargar del 10 al 80 % en cada potencia de la red: cuánto le entra, cuánto tarda, cuánto sale. */
function ChargingSection({ metricas, isError, f }: ChargingSectionProps) {
  const { t } = useTranslation();
  const tm = t.showroom.model;
  const desktop = useMediaQuery("(min-width: 900px)");

  if (!metricas) {
    if (isError) return null;
    return (
      <section aria-hidden="true" className={styles.charging}>
        <div className={styles.chargeSkeletonTitle} />
        <div className={styles.chargeSkeleton} />
      </section>
    );
  }

  const tarifas = metricas.tarifas_red;
  const tariffs = tarifas
    ? [
        tm.tariffsHead(tarifas.operador ?? "UTE", tarifas.vigencia),
        tarifas.dc &&
          tm.tariffDc(f.n(tarifas.dc.energia_uyu_kwh, 2), f.n(tarifas.dc.cargo_base_uyu)),
        tarifas.ac &&
          tm.tariffAc(f.n(tarifas.ac.energia_uyu_kwh, 2), f.n(tarifas.ac.cargo_base_uyu)),
        tm.tariffHome(f.n(tarifas.casa_uyu_kwh, 2)),
      ]
        .filter(Boolean)
        .join(" · ") + "."
    : null;
  const rows = metricas.carga;
  const stationLine = (r: (typeof rows)[number]) =>
    [tm.stations(f.n(r.estaciones)), r.modalidad].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="h-chg" className={styles.charging}>
      <div className={styles.chargingHead}>
        <h2 id="h-chg" className={styles.chargingTitle}>
          {tm.chargeTitle(metricas.carga_desde_pct, metricas.carga_hasta_pct)}
          <span className={styles.gain}>{tm.chargeGain(f.n(metricas.carga_km_recuperados))}</span>
        </h2>
        <p className={styles.chargingBody}>{tm.chargeBody}</p>
      </div>

      {desktop ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{tm.colStation}</th>
              <th scope="col">{tm.colDelivers}</th>
              <th scope="col">{tm.colTakes}</th>
              <th scope="col">{tm.colCosts}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <th scope="row">
                  <span className={styles.stationCell}>
                    <span className={styles.stationPower}>{f.n(r.potencia_kw)} kW</span>
                    <span className={styles.stationMeta}>{stationLine(r)}</span>
                  </span>
                </th>
                <td>{f.n(r.potencia_efectiva_kw)} kW</td>
                <td>{f.duration(r.minutos)}</td>
                <td className={styles.costCell}>
                  {r.costo_uyu != null ? `$U ${f.n(r.costo_uyu)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className={styles.chargeList}>
          {rows.map((r, i) => (
            <li key={i}>
              <span className={styles.chargeListMain}>
                <span className={styles.stationPower}>{f.n(r.potencia_kw)} kW</span>
                <span className={styles.stationMeta}>{stationLine(r)}</span>
              </span>
              <span className={styles.chargeListSide}>
                <span className={styles.chargeListCost}>
                  {r.costo_uyu != null ? `$U ${f.n(r.costo_uyu)}` : "—"}
                </span>
                <span className={styles.stationMeta}>{f.duration(r.minutos)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {tariffs && <p className={styles.tariffs}>{tariffs}</p>}
    </section>
  );
}
