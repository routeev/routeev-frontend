import type { ReactNode } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconCar, IconCheck, IconSearch } from "../map/panelIcons";
import styles from "./HowItWorks.module.css";

/**
 * Los cuatro pasos, cada uno con un pedazo de la app arriba (buscador, bloque
 * origen/destino, ruta con su parada, batería al llegar). Los pedazos son
 * dibujos: el texto de cada paso ya dice lo mismo, así que van ocultos para
 * los lectores de pantalla.
 */
export function HowItWorks() {
  const { t } = useTranslation();
  const h = t.landing.howItWorks;

  const steps: { title: string; body: string; visual: ReactNode }[] = [
    { ...h.pickCar, visual: <SearchVisual /> },
    { ...h.setPoints, visual: <PointsVisual /> },
    { ...h.calculate, visual: <RouteVisual oneStop={h.oneStop} /> },
    { ...h.arrive, visual: <ArriveVisual goodMargin={h.goodMargin} /> },
  ];

  return (
    <section id="como-funciona" aria-labelledby="pasos-titulo" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id="pasos-titulo" className={styles.title}>
            {h.title}
          </h2>
          <p className={styles.body}>{h.body}</p>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <div className={styles.visual} aria-hidden="true">
                {step.visual}
              </div>
              <div className={styles.stepText}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SearchVisual() {
  return (
    <div className={styles.searchVisual}>
      <div className={styles.searchBox}>
        <IconSearch size={16} />
        <span>
          Dolphin
          <span className={styles.caret} />
        </span>
      </div>
      <div className={styles.searchResult}>
        <span className={styles.carTile}>
          <IconCar size={16} />
        </span>
        BYD Dolphin
        <span className={styles.capacity}>60 kWh</span>
      </div>
    </div>
  );
}

function PointsVisual() {
  return (
    <div className={styles.pointsVisual}>
      <span className={styles.originDot} />
      <span className={styles.pointName}>Montevideo</span>
      <span className={styles.pointsLine} />
      <span className={styles.pointsDivider} />
      <span className={styles.destDiamond} />
      <span className={styles.pointName}>Rivera</span>
    </div>
  );
}

function RouteVisual({ oneStop }: { oneStop: string }) {
  return (
    <div className={styles.routeVisual}>
      <div className={styles.miniRoute}>
        <div className={styles.miniLine} />
        <span className={styles.miniOrigin} />
        <span className={styles.miniStop}>1</span>
        <span className={styles.miniDest} />
      </div>
      <div className={styles.routeMeta}>
        <span>497 km</span>
        <span className={styles.muted}>{oneStop}</span>
      </div>
    </div>
  );
}

function ArriveVisual({ goodMargin }: { goodMargin: string }) {
  return (
    <div className={styles.arriveVisual}>
      <div className={styles.arriveRow}>
        <span className={styles.arriveValue}>
          24<span className={styles.arriveUnit}>%</span>
        </span>
        <span className={styles.arriveTag}>
          <IconCheck size={15} />
          {goodMargin}
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>
    </div>
  );
}
