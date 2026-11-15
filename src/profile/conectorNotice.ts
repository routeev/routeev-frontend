// "Ya vio el aviso de marcar el conector del auto", para mostrarlo UNA vez.
//
// El conector (CCS2 / GB/T) llegó después que los autos: todos los que ya
// estaban cargados quedaron en CCS2, y quien tiene un GB/T no se entera de que
// puede marcarlo salvo que abra "Editar datos". Este aviso se lo dice una vez,
// arriba de la lista de autos.
//
// Mismo prefijo routeev_ que el resto de las claves de localStorage.
const STORAGE_KEY = "routeev_conector_notice_ack";

/** Ante la duda se MUESTRA: sin localStorage (modo privado, bloqueado) devuelve false. */
export function conectorNoticeVisto(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function marcarConectorNoticeVisto(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* best-effort: vale para esta visita y la próxima se muestra de nuevo */
  }
}

/**
 * ¿Hay que mostrar el aviso? Solo si la persona tiene autos y TODOS están en
 * CCS2 (el valor por defecto): apenas marca un GB/T ya sabe que la opción
 * existe, y con la lista vacía no hay a quién avisarle.
 */
export function debeAvisarConector(
  vehicles: { conector?: string | null }[],
  yaVisto: boolean
): boolean {
  if (yaVisto || vehicles.length === 0) return false;
  return vehicles.every((v) => (v.conector ?? "ccs2") === "ccs2");
}
