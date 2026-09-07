import type { EstadoDeEstacion, EstadoEstacion } from "../api/graph";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./StationStatusChip.module.css";

/**
 * Estado en vivo de UNA estación, cuando lo hay.
 *
 * Las tres reglas que no se negocian, porque el daño de equivocarse acá es
 * mandar a alguien con la batería justa a un cargador que no puede usar:
 *
 * 1. **Sin dato no se dibuja nada.** Ni un chip gris, ni "sin información".
 *    Un hueco se lee como "no sabemos"; un chip gris se lee como un estado.
 * 2. **`desconocido` es sin dato.** La fuente mandó algo que el backend no
 *    supo traducir. Es exactamente igual de ignorante que no haber mandado
 *    nada.
 * 3. **Siempre con procedencia y antigüedad.** "Según UTE, hace 4 min" y no
 *    "Ocupado". El estado es de un tercero y de un momento, y las dos cosas
 *    cambian lo que la persona debería hacer con él.
 */
export function StationStatusChip({
  estado,
  actualizado,
  fuente,
}: {
  estado: EstadoDeEstacion | null;
  actualizado: string | null;
  fuente: string;
}) {
  const { t } = useTranslation();
  const sc = t.map.stationStatus;

  if (!estado || estado.estado === "desconocido") return null;

  const clase: Record<Exclude<EstadoEstacion, "desconocido">, string> = {
    disponible: styles.disponible,
    ocupado: styles.ocupado,
    fuera_de_servicio: styles.fueraDeServicio,
  };

  return (
    <div className={styles.wrap}>
      <span className={`${styles.chip} ${clase[estado.estado]}`}>
        <span className={styles.dot} aria-hidden="true" />
        {sc.estado[estado.estado]}
      </span>
      <span className={styles.origen}>{sc.origen(fuente, antiguedad(actualizado, sc))}</span>
    </div>
  );
}

/**
 * "hace 4 min" a partir del ISO del backend.
 *
 * Se redondea hacia ABAJO en minutos y nunca dice "recién": un dato de 59
 * segundos que se muestra como "ahora" invita a confiar en él más de lo que
 * corresponde. El piso es "hace menos de 1 min".
 */
function antiguedad(actualizado: string | null, sc: { hace: (m: number) => string; reciente: string }): string {
  if (!actualizado) return sc.reciente;
  const ms = Date.now() - new Date(actualizado).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return sc.reciente;
  return sc.hace(Math.floor(ms / 60_000));
}
