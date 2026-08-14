/**
 * Si una estación es de un operador privado (eONE, DISA/EVE Move, Mobility
 * Recharge, DMC Mobility, Evergo...) en vez de la red pública de UTE.
 *
 * Se decide por lo NEGATIVO -- "todo lo que no es UTE" -- a propósito: la
 * lista de operadores privados crece cada vez que se releva uno nuevo, y una
 * lista blanca acá quedaría desactualizada en silencio, mostrando el cargador
 * nuevo como si fuera de UTE. UTE, en cambio, es uno solo y estable.
 */
export function esPrivada(operador: string | undefined | null): boolean {
  return !(operador ?? "").toUpperCase().includes("UTE");
}
