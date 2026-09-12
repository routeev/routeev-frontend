/**
 * Iniciales + color para el pin de un operador privado reconocible, para
 * distinguirlos de un vistazo en el mapa (mismo problema que resuelve el
 * mapa de la competencia, Uruguay Eléctrico, mostrando el isologo de cada
 * red). Texto propio en vez de reproducir el isologo real de cada
 * operador: no es nuestro para usar, y esto identifica igual sin ese
 * riesgo.
 *
 * UTE y cualquier operador sin marca reconocible ("Privado", o uno nuevo
 * relevado que todavía no está en esta lista) devuelven `null` -- se quedan
 * con el rayo genérico de siempre (ver stationIcon en markerIcons.ts). Se
 * decide por lista blanca (al revés que esPrivada.ts) a propósito: mostrar
 * dos letras que no dicen nada de un operador no contemplado es peor que no
 * mostrar nada.
 */

export interface OperatorBadge {
  iniciales: string;
  clase: "opEone" | "opEve" | "opEvergo" | "opDmc" | "opRecharge" | "opUmt";
}

// Substrings, no el nombre completo -- tolera variaciones menores de
// formato ("DISA EVE Move", "DISA/EVE Move") sin quedar tan fragil como una
// igualdad exacta. Elegidos para que ninguno sea substring de otro (EVERGO
// no matchea contra "EVE", RECHARGE no matchea contra "MOBILITY" que
// tambien tiene DMC Mobility).
const OPERADORES: { substring: string; iniciales: string; clase: OperatorBadge["clase"] }[] = [
  { substring: "EONE", iniciales: "EO", clase: "opEone" },
  { substring: "DISA", iniciales: "EV", clase: "opEve" },
  { substring: "EVERGO", iniciales: "EG", clase: "opEvergo" },
  { substring: "DMC", iniciales: "DM", clase: "opDmc" },
  { substring: "RECHARGE", iniciales: "MR", clase: "opRecharge" },
  { substring: "UMT", iniciales: "UMT", clase: "opUmt" },
];

export function operatorBadge(operador: string | undefined | null): OperatorBadge | null {
  const normalizado = (operador ?? "").toUpperCase();
  const match = OPERADORES.find((o) => normalizado.includes(o.substring));
  return match ? { iniciales: match.iniciales, clase: match.clase } : null;
}
