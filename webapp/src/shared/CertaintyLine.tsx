import styles from "./CertaintyLine.module.css";

/**
 * El elemento de firma del rebuild (front2.md, Parte 3.4): el perfil
 * bateria-vs-distancia de un viaje, la visualizacion directa de la pregunta
 * que responde el producto ("llego con la carga que tengo?"). Un solo
 * componente, reusado a tres escalas -- no tres implementaciones distintas.
 *
 * Contrato de `points`: dos puntos consecutivos con el mismo `km` dibujan un
 * salto vertical (la recarga). El primer punto de ese par lleva el nivel de
 * bateria ANTES de cargar; el segundo, DESPUES.
 */
export interface CertaintyPoint {
  km: number;
  batteryPct: number;
  chargeStop?: boolean;
  /** Nombre de ciudad a marcar bajo el punto (origen/parada/destino). Se ignora en escala "micro". */
  label?: string;
}

export type CertaintyLineScale = "micro" | "macro" | "hero";

interface CertaintyLineProps {
  points: CertaintyPoint[];
  scale?: CertaintyLineScale;
  className?: string;
}

const DIMENSIONS: Record<
  CertaintyLineScale,
  { width: number; height: number; pad: number; padBottom: number }
> = {
  micro: { width: 40, height: 16, pad: 1, padBottom: 1 },
  macro: { width: 480, height: 130, pad: 10, padBottom: 26 },
  hero: { width: 520, height: 230, pad: 12, padBottom: 30 },
};

export function CertaintyLine({ points, scale = "macro", className }: CertaintyLineProps) {
  if (points.length < 2) return null;

  const { width, height, pad, padBottom } = DIMENSIONS[scale];
  const maxKm = points[points.length - 1]!.km || 1;
  const plotHeight = height - pad - padBottom;
  const x = (km: number) => pad + (km / maxKm) * (width - pad * 2);
  const y = (pct: number) => pad + (1 - Math.max(0, Math.min(100, pct)) / 100) * plotHeight;

  const infeasible = points.some((p) => p.batteryPct <= 0);
  const strokeColor = infeasible ? "var(--danger)" : "var(--accent-astar)";
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.km).toFixed(1)} ${y(p.batteryPct).toFixed(1)}`)
    .join(" ");
  const stops = scale === "micro" ? [] : points.filter((p) => p.chargeStop);
  const labeled = scale === "micro" ? [] : points.filter((p) => p.label);

  return (
    <svg
      className={[styles.root, scale === "hero" ? styles.animated : "", className].filter(Boolean).join(" ")}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        infeasible
          ? "Perfil de batería del viaje: no es factible con este vehículo"
          : "Perfil de batería a lo largo del viaje"
      }
    >
      <path
        d={path}
        pathLength={1}
        fill="none"
        stroke={strokeColor}
        strokeWidth={scale === "micro" ? 1.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {stops.map((p, i) => (
        <circle key={`stop-${i}`} cx={x(p.km)} cy={y(p.batteryPct)} r={3} fill="var(--accent-dijkstra)" />
      ))}
      {labeled.map((p, i) => (
        <g key={`label-${i}`}>
          <circle cx={x(p.km)} cy={y(p.batteryPct)} r={2} fill="var(--text-faint)" />
          <text
            x={x(p.km)}
            y={height - padBottom + 16}
            textAnchor={p.km === 0 ? "start" : p.km === maxKm ? "end" : "middle"}
            className={styles.label}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
