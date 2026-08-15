import styles from "./Skeletons.module.css";

/**
 * La primera pantalla del showroom era la palabra "Cargando catálogo…" sola en
 * el medio de una página vacía: sobre conexiones lentas se queda así varios
 * segundos y no se distingue de una página rota. El esqueleto muestra desde
 * el primer frame CUÁNTO va a venir y CON QUÉ FORMA, así que cuando llega el
 * catálogo la pantalla se completa en vez de reconstruirse.
 *
 * Son 8 tarjetas y no las 24 de PAGINA (useShowroomCatalog.ts): con 8 ya se
 * llena la primera pantalla en cualquier ancho, y las otras 16 serían 16
 * bloques animados de más corriendo mientras el navegador todavía está
 * bajando y parseando el catálogo de verdad.
 */
const TARJETAS = 8;

export function ModelGridSkeleton() {
  return (
    // aria-hidden: para un lector de pantalla esto es ruido puro (24 cajas sin
    // texto). El aviso de que hay algo cargando lo da quien lo monta, con un
    // aria-busy y un texto de verdad.
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: TARJETAS }, (_, i) => (
        <div className={styles.card} key={i}>
          <div className={[styles.block, styles.art].join(" ")} />
          <div className={styles.body}>
            <div className={[styles.block, styles.lineMarca].join(" ")} />
            <div className={[styles.block, styles.lineModelo].join(" ")} />
            <div className={styles.specs}>
              <div className={[styles.block, styles.lineSpec].join(" ")} />
              <div className={[styles.block, styles.lineSpec].join(" ")} />
              <div className={[styles.block, styles.lineSpec].join(" ")} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mismo criterio para la ficha: foto grande, título y la fila de números. */
export function FichaSkeleton() {
  return (
    <div className={styles.ficha} aria-hidden="true">
      <div className={[styles.block, styles.fichaFoto].join(" ")} />
      <div>
        <div className={[styles.block, styles.fichaTitulo].join(" ")} />
        <div className={[styles.block, styles.fichaModelo].join(" ")} />
        <div className={styles.fichaStats}>
          {Array.from({ length: 6 }, (_, i) => (
            <div className={[styles.block, styles.fichaStat].join(" ")} key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
