import type { CSSProperties } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import {
  NATIONAL_ROADS,
  ROUTE_5,
  ROUTE_5_CHARGE_STOP_INDEX,
  URUGUAY_OUTLINE,
  project,
  toSvgPoints,
} from "./uruguayMap";
import styles from "./PhoneMockup.module.css";

// Tesela de origen del dibujo (zoom 7) y cómo se encuadra en la pantalla de
// 298px: el SVG se dibuja a escala de tesela y se achica a 0.54.
const TILE_X = 43;
const TILE_Y = 74;
const MAP_SCALE = 0.54;
const MAP_LEFT = -11.4;
const MAP_TOP = -26;

const OUTLINE = toSvgPoints(URUGUAY_OUTLINE, TILE_X, TILE_Y);
const ROADS = NATIONAL_ROADS.map((road) => toSvgPoints(road, TILE_X, TILE_Y));
const ROUTE = toSvgPoints(ROUTE_5, TILE_X, TILE_Y);

/** Posición en la pantalla del teléfono de un pin de `size` px centrado sobre el punto. */
function pinAt(point: (typeof ROUTE_5)[number], size: number): CSSProperties {
  const [x, y] = project(point, TILE_X, TILE_Y);
  return { left: MAP_LEFT + x * MAP_SCALE - size / 2, top: MAP_TOP + y * MAP_SCALE - size / 2 };
}

const ORIGIN_PIN = pinAt(ROUTE_5[0], 12);
const DESTINATION_PIN = pinAt(ROUTE_5[ROUTE_5.length - 1], 16);
const CHARGE_STOP_PIN = pinAt(ROUTE_5[ROUTE_5_CHARGE_STOP_INDEX], 26);

/**
 * La app en un teléfono, a 316×652. Es una ilustración: los datos del viaje
 * son de ejemplo y nada es interactivo, así que va entera fuera del árbol de
 * accesibilidad. Siempre oscura, como la app.
 */
export function PhoneMockup() {
  const { t } = useTranslation();
  const p = t.welcome.phone;

  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.screen}>
        <div className={styles.map}>
          <svg width="768" height="1280" viewBox="0 0 768 1280">
            <polygon points={OUTLINE} className={styles.country} />
            {ROADS.map((points) => (
              <polyline key={points} points={points} className={styles.road} />
            ))}
            <polyline points={ROUTE} className={styles.routeGlow} />
            <polyline points={ROUTE} className={styles.route} />
          </svg>
        </div>
        <div className={styles.shade} />

        <div className={styles.pin} style={ORIGIN_PIN}>
          <div className={styles.originDot} />
        </div>
        <div className={styles.pin} style={DESTINATION_PIN}>
          <div className={styles.destinationDot} />
        </div>
        <div className={[styles.pin, styles.chargeStop].join(" ")} style={CHARGE_STOP_PIN}>
          <div className={styles.chargeDot}>
            <svg width="12" height="13" viewBox="0 0 12 13">
              <polygon points="7,0 1,7.5 5.5,7.5 4.5,13 11,5 6.5,5" />
            </svg>
          </div>
          <div className={styles.chargeLabel}>{p.chargeStop}</div>
        </div>

        <div className={styles.statusBar}>
          <span>9:41</span>
          <div className={styles.battery}>
            <div />
          </div>
        </div>
        <div className={styles.island} />

        <div className={styles.routeCard}>
          <div className={styles.routeRow}>
            <span className={styles.originMark} />
            {p.origin}
          </div>
          <div className={styles.routeDivider} />
          <div className={styles.routeRow}>
            <span className={styles.destinationMark} />
            {p.destination}
          </div>
        </div>

        <div className={styles.tripCard}>
          <div className={styles.tripHead}>
            <span className={styles.vehicle}>{p.vehicle}</span>
            <span className={styles.summary}>{p.summary}</span>
          </div>
          <div className={styles.charge}>
            <div className={styles.chargeTrack}>
              <div className={styles.chargeFill} />
            </div>
            <div className={styles.chargeMeta}>
              <span>
                {p.arriveWith} <span className={styles.value}>24%</span>
              </span>
              <span className={styles.value}>$U 410</span>
            </div>
          </div>
          <div className={styles.startTrip}>{p.startTrip}</div>
        </div>
      </div>
    </div>
  );
}
