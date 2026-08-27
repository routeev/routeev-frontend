import { describe, expect, it } from "vitest";
import type { TarifaRecarga } from "../api/showroom";
import { showroom as showroomEs } from "../i18n/dictionaries/es/showroom";
import { formatUyu } from "../shared/format";
import { num } from "./num";
import { tarifaLinea } from "./tarifaTexto";

const tt = showroomEs.tarifaTexto;

function tarifa(overrides: Partial<TarifaRecarga> = {}): TarifaRecarga {
  return {
    tarifa_conocida: true,
    operador_tarifa: "UTE",
    modalidad: "DC",
    tarifa_uyu_kwh: 12.4,
    cargo_base_uyu: 91,
    costo_energia_uyu: 310,
    costo_uyu: 401,
    ocupacion_uyu_min: 8.5,
    ocupacion_tolerancia_min: 10,
    estacionamiento_uyu_min: null,
    reserva_uyu: null,
    ...overrides,
  };
}

describe("tarifaLinea", () => {
  // Los montos esperados se arman con los mismos formatters (num/formatUyu):
  // lo que se testea acá es la composición de la línea (qué rama, qué partes,
  // en qué orden), no cómo ICU imprime el es-UY.
  it("arma la línea según lo que el operador publica", () => {
    expect(tarifaLinea(tarifa(), tt)).toBe(
      `Tarifa UTE DC: $ ${num(12.4, 2)}/kWh + ${formatUyu(91)} de conexión · pasados 10 min sin cargar: $ ${num(8.5, 2)}/min`
    );
    // Sin cargo de ocupación, la cola informativa no aparece.
    expect(tarifaLinea(tarifa({ ocupacion_uyu_min: null, ocupacion_tolerancia_min: null }), tt)).toBe(
      `Tarifa UTE DC: $ ${num(12.4, 2)}/kWh + ${formatUyu(91)} de conexión`
    );
    // Operador sin pliego: aviso fijo, nunca números inventados.
    expect(tarifaLinea(tarifa({ tarifa_conocida: false }), tt)).toBe(
      "Tarifa del operador no publicada — costo no incluido en el total"
    );
  });
});
