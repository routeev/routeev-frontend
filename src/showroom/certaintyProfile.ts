import type { CertaintyPoint } from "../shared/CertaintyLine";
import type { Segment } from "./simulationTimeline";

/**
 * Convierte la línea de tiempo de la simulación (segments de
 * simulationTimeline.ts) en los puntos que consume <CertaintyLine> --
 * el elemento de firma del sistema de diseño (front2.md 3.4) reusado acá en
 * modo "macro" con el dato real de la ficha, no con el ejemplo del hero.
 */
export function certaintyPointsFromSegments(
  segments: Segment[],
  capacidadKwh: number,
  origenNombre: string,
  destinoNombre: string
): CertaintyPoint[] {
  const pct = (kwh: number) => Math.max(0, Math.min(100, (kwh / capacidadKwh) * 100));
  const points: CertaintyPoint[] = [];

  for (const s of segments) {
    if (s.type === "drive") {
      points.push({ km: s.kmGlobalFrom, batteryPct: pct(s.battFrom) });
      points.push({ km: s.kmGlobalTo, batteryPct: pct(s.battTo) });
    } else if (s.type === "charge") {
      points.push({ km: s.kmGlobal, batteryPct: pct(s.battFrom) });
      points.push({ km: s.kmGlobal, batteryPct: pct(s.battTo), chargeStop: true, label: s.parada.nombre });
    }
  }

  if (points.length) {
    points[0] = { ...points[0]!, label: origenNombre };
    points[points.length - 1] = { ...points[points.length - 1]!, label: destinoNombre };
  }
  return points;
}
