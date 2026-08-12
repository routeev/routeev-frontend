import type { TarifaRecarga } from "../api/showroom";
import { formatUyu } from "../shared/format";
import { num } from "./num";

/**
 * Línea de tarifa que acompaña cada parada de la simulación. Es una función
 * pura a propósito: el copy mezcla tres formatos distintos ($/kWh con dos
 * decimales, monto entero de conexión, $/min de ocupación) y así se puede
 * testear sin montar el componente.
 */
export function tarifaLinea(t: TarifaRecarga): string {
  if (!t.tarifa_conocida) {
    // Operador sin pliego publicado: el backend manda costo null y acá no se
    // inventa un número -- solo se avisa que el total no lo incluye.
    return "Tarifa del operador no publicada — costo no incluido en el total";
  }
  const encabezado = ["Tarifa", t.operador_tarifa, t.modalidad].filter(Boolean).join(" ");
  let linea = `${encabezado}: $ ${num(t.tarifa_uyu_kwh ?? 0, 2)}/kWh + ${formatUyu(t.cargo_base_uyu ?? 0)} de conexión`;
  // El cargo por ocupación es informativo (depende de cuánto se demore el
  // conductor en desenchufar): se muestra pero NO está sumado en ningún total.
  if (t.ocupacion_uyu_min != null && t.ocupacion_tolerancia_min != null) {
    linea += ` · pasados ${t.ocupacion_tolerancia_min} min sin cargar: $ ${num(t.ocupacion_uyu_min, 2)}/min`;
  }
  return linea;
}
