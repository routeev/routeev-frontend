import styles from "./UruguayGraph.module.css";

/**
 * Grafo animado de las 19 capitales departamentales de Uruguay (posiciones
 * relativas aproximadas a su geografia real, no arbitrarias -- misma cifra
 * que ya aparece en las stats de la landing), con la ruta de ejemplo
 * Montevideo -> Tacuarembo (carga) -> Rivera resaltada. Reemplaza a
 * CertaintyLine como visual principal del hero (front2.md 3.4 documentaba
 * ese lugar para la "linea de certeza"; esta pieza lo ocupa en su lugar,
 * CertaintyLine sigue viva en showroom/perfil).
 */

type LabelSide = "left" | "right" | "top" | "bottom";

interface Node {
  id: string;
  x: number;
  y: number;
  label?: string;
  side?: LabelSide;
}

const NODES: Node[] = [
  { id: "artigas", x: 70, y: 20 },
  { id: "rivera", x: 250, y: 18, label: "Rivera", side: "top" },
  { id: "salto", x: 55, y: 110, label: "Salto", side: "left" },
  { id: "paysandu", x: 78, y: 195, label: "Paysandú", side: "left" },
  { id: "tacuarembo", x: 215, y: 150, label: "Tacuarembó", side: "right" },
  { id: "cerrolargo", x: 365, y: 170, label: "Melo", side: "right" },
  { id: "rionegro", x: 62, y: 262, label: "Fray Bentos", side: "left" },
  { id: "durazno", x: 218, y: 270, label: "Durazno", side: "right" },
  { id: "treintaytres", x: 358, y: 278, label: "Treinta y Tres", side: "right" },
  { id: "flores", x: 152, y: 300 },
  { id: "soriano", x: 78, y: 332, label: "Mercedes", side: "left" },
  { id: "florida", x: 197, y: 355 },
  { id: "lavalleja", x: 302, y: 345 },
  { id: "rocha", x: 402, y: 390, label: "Rocha", side: "right" },
  { id: "sanjose", x: 118, y: 400 },
  { id: "colonia", x: 42, y: 420, label: "Colonia", side: "left" },
  { id: "canelones", x: 168, y: 435 },
  { id: "montevideo", x: 150, y: 470, label: "Montevideo", side: "bottom" },
  { id: "maldonado", x: 332, y: 450, label: "Punta del Este", side: "right" },
];

const EDGES: [string, string][] = [
  ["artigas", "rivera"],
  ["artigas", "salto"],
  ["rivera", "tacuarembo"],
  ["rivera", "cerrolargo"],
  ["salto", "paysandu"],
  ["salto", "tacuarembo"],
  ["paysandu", "rionegro"],
  ["tacuarembo", "durazno"],
  ["tacuarembo", "cerrolargo"],
  ["cerrolargo", "treintaytres"],
  ["rionegro", "flores"],
  ["rionegro", "soriano"],
  ["durazno", "flores"],
  ["durazno", "treintaytres"],
  ["durazno", "florida"],
  ["treintaytres", "lavalleja"],
  ["treintaytres", "rocha"],
  ["flores", "soriano"],
  ["soriano", "sanjose"],
  ["florida", "lavalleja"],
  ["florida", "canelones"],
  ["lavalleja", "maldonado"],
  ["sanjose", "colonia"],
  ["sanjose", "canelones"],
  ["canelones", "montevideo"],
];

// Montevideo -> Tacuarembo (parada de carga) -> Rivera, la misma ruta de
// ejemplo que usa el resto del sitio (og:image, showroom).
const ROUTE_IDS = ["montevideo", "canelones", "florida", "durazno", "tacuarembo", "rivera"];
const CHARGE_STOP_ID = "tacuarembo";
const ORIGIN_ID = "montevideo";
const DEST_ID = "rivera";

const byId = new Map(NODES.map((n) => [n.id, n]));

const LABEL_OFFSET: Record<LabelSide, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  left: { dx: -8, dy: 3, anchor: "end" },
  right: { dx: 8, dy: 3, anchor: "start" },
  top: { dx: 0, dy: -8, anchor: "middle" },
  bottom: { dx: 0, dy: 16, anchor: "middle" },
};

export function UruguayGraph() {
  const routePoints = ROUTE_IDS.map((id) => byId.get(id)!);
  const routePath = routePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg
      className={styles.root}
      viewBox="0 0 440 500"
      role="img"
      aria-label="Mapa de Uruguay con las 19 capitales departamentales y una ruta de ejemplo entre Montevideo y Rivera, con una parada de carga en Tacuarembó"
    >
      <g className={styles.edge}>
        {EDGES.map(([a, b]) => {
          const from = byId.get(a)!;
          const to = byId.get(b)!;
          return <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </g>

      <path className={styles.route} d={routePath} pathLength={1} />

      {NODES.map((node, i) => {
        const isOrigin = node.id === ORIGIN_ID;
        const isDest = node.id === DEST_ID;
        const isChargeStop = node.id === CHARGE_STOP_ID;
        const r = isOrigin || isDest ? 5.5 : isChargeStop ? 5 : 3;
        const dotClass = isOrigin
          ? styles.origin
          : isDest
            ? styles.dest
            : isChargeStop
              ? styles.chargeStop
              : undefined;
        const delay = `${120 + i * 35}ms`;

        return (
          <g key={node.id} className={styles.node}>
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              className={dotClass}
              style={{ animationDelay: delay }}
            />
            {node.label && node.side && (
              <text
                x={node.x + LABEL_OFFSET[node.side].dx}
                y={node.y + LABEL_OFFSET[node.side].dy}
                textAnchor={LABEL_OFFSET[node.side].anchor}
                className={styles.label}
                style={{ animationDelay: `${120 + i * 35 + 100}ms` }}
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
