import { BatArt, CobwebArt, GhostArt, MoonArt, PumpkinArt, WitchHatArt } from "./halloweenArt";
import { useSeason } from "./season";
import styles from "./HalloweenDecor.module.css";

// Cada adorno devuelve null fuera de temporada, así que
// montarlos no cuesta nada el resto del año. Ninguno va sobre el mapa, el
// panel de viaje ni la navegación en vivo: solo en páginas públicas y en
// estados vacíos.

/**
 * Cielo de noche del hero de la landing: degradé, telaraña, luna detrás del
 * mapa, murciélagos y niebla. Va como primer hijo de una sección con
 * position: relative y overflow: hidden; el contenido que viene después queda
 * por encima.
 */
export function HeroNight() {
  if (!useSeason()) return null;
  return (
    <div className={styles.sky} aria-hidden="true">
      <CobwebArt className={styles.web} />
      <div className={styles.heroMoon}>
        <MoonArt className={styles.fill} />
        <BatArt className={`${styles.bat} ${styles.batA}`} />
        <BatArt className={`${styles.bat} ${styles.batB}`} />
      </div>
      <div className={styles.fog} />
    </div>
  );
}

/** Lo mismo para el login, sin murciélagos ni niebla: la tarjeta es lo importante. */
export function LoginNight() {
  if (!useSeason()) return null;
  return (
    <div className={styles.loginSky} aria-hidden="true">
      <CobwebArt className={styles.web} />
      <MoonArt className={styles.loginMoon} />
    </div>
  );
}

/** Sombrerito apoyado en la esquina del logo, por fuera del trazo. El link necesita position: relative. */
export function WitchHat() {
  if (!useSeason()) return null;
  return <WitchHatArt className={styles.hat} />;
}

/** Reemplaza al ícono neutro de un estado vacío. */
export function Pumpkin({ size = 64 }: { size?: number }) {
  if (!useSeason()) return null;
  return <PumpkinArt size={size} className={styles.pumpkin} />;
}

/** Estado vacío de los filtros de estaciones. */
export function Ghost() {
  if (!useSeason()) return null;
  return <GhostArt width={84} className={styles.ghost} />;
}
