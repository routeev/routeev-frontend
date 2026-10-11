import type { Localidad } from "../api/graph";
import { normalizeForSearch } from "../shared/geo";

/**
 * Sugerencias de LUGARES con nombre para el buscador de origen y destino: los
 * 19 departamentos y las ~96 localidades de /api/graph/localidades.
 *
 * Antes el buscador solo ofrecía cruces de calles, así que escribir "Rivera"
 * mostraba primero "Avenida Rivera y ..." -- una calle de Montevideo -- sin
 * ninguna forma de distinguirla del departamento. Ahora cada sugerencia dice
 * qué es, y los lugares van antes que las calles.
 *
 * Un departamento no es un punto: elegirlo lleva a su capital (es_capital,
 * definido en la API), y el campo lo dice ("Departamento de Rivera").
 */
export type SugerenciaLugar =
  | { type: "departamento"; departamento: string; capital: Localidad }
  | { type: "localidad"; localidad: Localidad };

const MAX_DEPARTAMENTOS = 3;
const MAX_LOCALIDADES = 4;

// Lo que la gente antepone al nombre de un departamento cuando lo busca así.
const PREFIJOS_DEPARTAMENTO = [
  "departamento de ",
  "departamento ",
  "depto. ",
  "depto ",
  "dpto. ",
  "dpto ",
];

function sinPrefijoDeDepartamento(q: string): { q: string; pidioDepartamento: boolean } {
  for (const p of PREFIJOS_DEPARTAMENTO) {
    if (q.startsWith(p)) return { q: q.slice(p.length).trim(), pidioDepartamento: true };
  }
  return { q, pidioDepartamento: false };
}

/** 0 si empieza con la consulta, 1 si alguna palabra empieza con ella, null si no coincide. */
function rango(texto: string, q: string): number | null {
  if (texto.startsWith(q)) return 0;
  if (texto.includes(` ${q}`)) return 1;
  return null;
}

export function sugerirLugares(consulta: string, localidades: Localidad[]): SugerenciaLugar[] {
  const normalizada = normalizeForSearch(consulta.trim()).replace(/\s+/g, " ");
  const { q, pidioDepartamento } = sinPrefijoDeDepartamento(normalizada);
  if (!q) return [];

  const departamentos: { s: SugerenciaLugar; r: number }[] = [];
  for (const capital of localidades) {
    if (!capital.es_capital) continue;
    const r = rango(normalizeForSearch(capital.departamento), q);
    if (r !== null)
      departamentos.push({
        s: { type: "departamento", departamento: capital.departamento, capital },
        r,
      });
  }

  const ciudades: { s: SugerenciaLugar; r: number }[] = [];
  if (!pidioDepartamento) {
    for (const localidad of localidades) {
      const rangos = [localidad.nombre, ...localidad.alias]
        .map((n) => rango(normalizeForSearch(n), q))
        .filter((r): r is number => r !== null);
      if (rangos.length)
        ciudades.push({ s: { type: "localidad", localidad }, r: Math.min(...rangos) });
    }
  }

  const ordenar = (a: { s: SugerenciaLugar; r: number }, b: { s: SugerenciaLugar; r: number }) =>
    a.r - b.r || nombreDe(a.s).localeCompare(nombreDe(b.s), "es");
  return [
    ...departamentos.sort(ordenar).slice(0, MAX_DEPARTAMENTOS),
    ...ciudades.sort(ordenar).slice(0, MAX_LOCALIDADES),
  ].map((x) => x.s);
}

function nombreDe(s: SugerenciaLugar): string {
  return s.type === "departamento" ? s.departamento : s.localidad.nombre;
}
