import type { TarifaRecarga } from "../api/showroom";
import type { showroom } from "../i18n/dictionaries/en/showroom";
import { formatUyu } from "../shared/format";
import { num } from "./num";

type TarifaTextoDict = typeof showroom.tarifaTexto;

/**
 * Línea de tarifa que acompaña cada parada de la simulación. Es una función
 * pura a propósito: el copy mezcla tres formatos distintos ($/kWh con dos
 * decimales, monto entero de conexión, $/min de ocupación) y así se puede
 * testear sin montar el componente.
 */
export function tarifaLinea(t: TarifaRecarga, tt: TarifaTextoDict): string {
  if (!t.tarifa_conocida) {
    // Operador sin pliego publicado: el backend manda costo null y acá no se
    // inventa un número -- solo se avisa que el total no lo incluye.
    return tt.noPublicada;
  }
  const encabezado = [tt.tarifaLabel, t.operador_tarifa, t.modalidad].filter(Boolean).join(" ");
  let linea = tt.linea(encabezado, num(t.tarifa_uyu_kwh ?? 0, 2), formatUyu(t.cargo_base_uyu ?? 0));
  // El cargo por ocupación es informativo (depende de cuánto se demore el
  // conductor en desenchufar): se muestra pero NO está sumado en ningún total.
  if (t.ocupacion_uyu_min != null && t.ocupacion_tolerancia_min != null) {
    linea += tt.ocupacionSufijo(t.ocupacion_tolerancia_min, num(t.ocupacion_uyu_min, 2));
  }
  return linea;
}
