import type { CSSProperties } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconCar, IconCheck } from "../map/panelIcons";
import {
  NATIONAL_ROADS,
  ROUTE_5,
  ROUTE_5_CHARGE_STOP_INDEX,
  URUGUAY_OUTLINE,
  project,
  toSvgPoints,
} from "../welcome/uruguayMap";
import styles from "./HeroMap.module.css";

// Misma tesela de origen que el mapa del teléfono de la bienvenida.
const TILE_X = 43;
const TILE_Y = 74;

// Qué parte del dibujo se ve: con el mapa ancho, el país entero en 760×640;
// angosto, un recorte más cerrado sobre la ruta, en 530×520.
const VIEW_WIDE = { x: 20, y: 260, w: 760, h: 640 };
const VIEW_NARROW = { x: 30, y: 310, w: 530, h: 520 };
type View = typeof VIEW_WIDE;

const OUTLINE = toSvgPoints(URUGUAY_OUTLINE, TILE_X, TILE_Y);
const ROADS = NATIONAL_ROADS.map((road) => toSvgPoints(road, TILE_X, TILE_Y));
const ROUTE = toSvgPoints(ROUTE_5, TILE_X, TILE_Y);

/**
 * Dónde cae un punto, en % del recorte, para los dos recortes a la vez: el
 * CSS elige cuál usar según el ancho del mapa, así hay un solo juego de pines.
 */
function pinAt(point: (typeof ROUTE_5)[number]): CSSProperties {
  const [x, y] = project(point, TILE_X, TILE_Y);
  const pct = (value: number, from: number, size: number) =>
    `${(((value - from) / size) * 100).toFixed(2)}%`;
  return {
    "--xw": pct(x, VIEW_WIDE.x, VIEW_WIDE.w),
    "--yw": pct(y, VIEW_WIDE.y, VIEW_WIDE.h),
    "--xn": pct(x, VIEW_NARROW.x, VIEW_NARROW.w),
    "--yn": pct(y, VIEW_NARROW.y, VIEW_NARROW.h),
  } as CSSProperties;
}

const ORIGIN_PIN = pinAt(ROUTE_5[0]);
const DESTINATION_PIN = pinAt(ROUTE_5[ROUTE_5.length - 1]);
const STOP_PIN = pinAt(ROUTE_5[ROUTE_5_CHARGE_STOP_INDEX]);

function Drawing({ view, className }: { view: View; className: string }) {
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={[styles.drawing, className].join(" ")}
    >
      <polygon points={OUTLINE} className={styles.country} />
      {ROADS.map((points) => (
        <polyline key={points} points={points} className={styles.road} />
      ))}
      <polyline points={ROUTE} className={styles.routeGlow} />
      <polyline points={ROUTE} className={styles.route} />
    </svg>
  );
}

/**
 * Un viaje resuelto sobre el mapa, con los paneles de /app encima: el bloque
 * origen/destino arriba y el resultado abajo (angosto, como la hoja inferior
 * de /app). Datos de ejemplo. Es un dibujo: para los lectores de pantalla, el
 * viaje entero va en el aria-label del <figure>.
 */
export function HeroMap() {
  const { t } = useTranslation();
  const h = t.landing.hero;
  const b = t.landing.battery;

  return (
    <div className={styles.root}>
      <figure aria-label={h.mapAria} className={styles.figure}>
        <div className={styles.canvas} aria-hidden="true">
          <Drawing view={VIEW_WIDE} className={styles.wideOnly} />
          <Drawing view={VIEW_NARROW} className={styles.narrowOnly} />

          <div className={[styles.pin, styles.pinOrigin].join(" ")} style={ORIGIN_PIN}>
            <span className={styles.originDot} />
            <span className={styles.pinLabel}>Montevideo</span>
          </div>
          <div className={[styles.pin, styles.pinDest].join(" ")} style={DESTINATION_PIN}>
            <span className={styles.destDiamond} />
            <span className={styles.pinLabel}>Rivera</span>
          </div>
          <div className={[styles.pin, styles.pinStop].join(" ")} style={STOP_PIN}>
            <span className={styles.stopSquare}>1</span>
            <span className={styles.stopLabel}>
              Paso de los Toros · <span className={styles.stopMinutes}>25 min</span>
            </span>
          </div>
        </div>

        <div className={styles.odPanel} aria-hidden="true">
          <div className={styles.odGrid}>
            <span className={styles.odOrigin} />
            <span className={styles.odName}>Montevideo</span>
            <span className={styles.odLine} />
            <span className={styles.odDivider} />
            <span className={styles.odDest} />
            <span className={styles.odName}>Rivera</span>
          </div>
          <span className={styles.vehicle}>
            <IconCar size={15} />
            {h.vehicle}
          </span>
        </div>

        <div className={styles.result} aria-hidden="true">
          <span className={styles.handle} />
          <div className={styles.resultHead}>
            <span>{b.arriveWith}</span>
            <span className={styles.resultTag}>
              <IconCheck size={15} />
              {b.goodMargin}
            </span>
          </div>
          <span className={styles.resultValue}>
            24<span className={styles.resultUnit}>%</span>
          </span>
          <div className={styles.track}>
            <div className={styles.fill} />
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                6<span className={styles.unitH}>h</span>15
              </span>
              <span className={styles.statLabel}>{b.time}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                <span className={styles.unitCost}>≈ $U</span>740
              </span>
              <span className={styles.statLabel}>{b.cost}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>1</span>
              <span className={styles.statLabel}>{h.stops}</span>
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}
