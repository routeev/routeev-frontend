// Los adornos, ya colocados. Cada uno devuelve null fuera de temporada, asi
// que fuera del 27/10-2/11 no se monta un solo nodo y estos archivos son
// peso muerto en el bundle y nada mas.
//
// Nada de esto va sobre el mapa, el panel de viaje ni la navegacion en
// vivo: /app se usa manejando, y ahi cada adorno es una cosa mas que el ojo
// tiene que descartar en medio segundo. En /app el disfraz es solo la
// paleta.

import { Calabaza, Fantasma, Luna, Murcielago, Sombrero, Telarana } from "./halloweenArt";
import { useSeason } from "./season";
import styles from "./HalloweenDecor.module.css";

/**
 * La portada: noche, luna, dos murcielagos cruzandola, telarana en la
 * esquina y niebla al pie. En mobile quedan solo la noche y la niebla -- la
 * luna y la telarana pisarian el titular, y los murcielagos van con la
 * luna.
 *
 * Va como PRIMER hijo de .hero (que ya es position: relative; overflow:
 * hidden), antes del resplandor, para quedar debajo del texto.
 */
export function HeroNight() {
  if (useSeason() !== "halloween") return null;

  return (
    <div className={styles.capa} aria-hidden="true">
      <div className={styles.noche} />
      <Luna className={`${styles.luna} ${styles.lunaPortada}`} />
      <div className={`${styles.murcielagos}`}>
        <Murcielago className={styles.batGrande} />
        <Murcielago className={styles.batChico} />
      </div>
      <Telarana className={`${styles.telarana} ${styles.telaranaPortada}`} />
      <div className={styles.niebla} />
    </div>
  );
}

/**
 * El login: noche, luna arriba a la derecha (por encima de la tarjeta, sin
 * tocarla) y telarana en la esquina. Las aristas del fondo de rutas
 * punteadas se pintan como hilos desde GraphBackground.module.css, no desde
 * aca.
 */
export function LoginNight() {
  if (useSeason() !== "halloween") return null;

  return (
    <div className={styles.capa} aria-hidden="true">
      <div className={styles.noche} />
      <Luna className={`${styles.luna} ${styles.lunaLogin}`} />
      <Telarana className={`${styles.telarana} ${styles.telaranaLogin}`} />
    </div>
  );
}

/**
 * El sombrerito de bruja del logo. Necesita que su contenedor sea
 * position: relative -- se apoya en la esquina del recuadro, por fuera del
 * trazo.
 */
export function WitchHat() {
  if (useSeason() !== "halloween") return null;
  return <Sombrero className={styles.sombrero} />;
}

/**
 * La calabaza de los estados vacios (viajes, autos, "sin resultados"). Solo
 * ahi: es naranja, y naranja en un aviso o en un marcador significa "margen
 * bajo" / "UTE".
 */
export function Pumpkin() {
  if (useSeason() !== "halloween") return null;
  return <Calabaza className={styles.calabaza} />;
}

/** El fantasmita enchufado: el vacio de la lista de Estaciones. */
export function Ghost() {
  if (useSeason() !== "halloween") return null;
  return <Fantasma className={styles.fantasma} />;
}
