import styles from "./GraphBackground.module.css";

/** Grafo/ruta decorativos animados, portados de login.html. Fondo del login: el dibujo no se toca. */
export function GraphBackground() {
  return (
    <svg className={styles.bg} preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 600" aria-hidden="true">
      <g className={styles.edge}>
        <line x1="40" y1="500" x2="180" y2="420" />
        <line x1="180" y1="420" x2="150" y2="280" />
        <line x1="150" y1="280" x2="280" y2="200" />
        <line x1="280" y1="200" x2="420" y2="230" />
        <line x1="420" y1="230" x2="520" y2="140" />
        <line x1="520" y1="140" x2="660" y2="110" />
        <line x1="420" y1="230" x2="470" y2="360" />
        <line x1="470" y1="360" x2="620" y2="400" />
        <line x1="620" y1="400" x2="740" y2="330" />
        <line x1="150" y1="280" x2="60" y2="200" />
        <line x1="470" y1="360" x2="380" y2="470" />
        <line x1="620" y1="400" x2="600" y2="540" />
      </g>
      <polyline className={styles.route} points="40,500 180,420 150,280 280,200 420,230 520,140 660,110" />
      <g className={styles.node}>
        <circle cx="40" cy="500" r="4" />
        <circle cx="180" cy="420" r="4" />
        <circle cx="150" cy="280" r="4" />
        <circle cx="280" cy="200" r="4" />
        <circle cx="420" cy="230" r="4" />
        <circle cx="520" cy="140" r="4" />
        <circle cx="660" cy="110" r="4" />
        <circle cx="60" cy="200" r="3" />
        <circle cx="470" cy="360" r="3" />
        <circle cx="620" cy="400" r="3" />
        <circle cx="740" cy="330" r="3" />
        <circle cx="380" cy="470" r="3" />
        <circle cx="600" cy="540" r="3" />
      </g>
    </svg>
  );
}
