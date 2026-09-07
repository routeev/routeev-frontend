import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EstadoDeEstacion } from "../api/graph";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { StationStatusChip } from "./StationStatusChip";

/**
 * Lo que estos tests protegen no es el diseño del chip: es que la interfaz no
 * afirme un estado que nadie midió.
 *
 * El caso que importa es el de hoy -- el feed de UTE devuelve una constante,
 * el backend no publica nada, y acá no tiene que dibujarse absolutamente nada.
 * Si alguna vez alguien "mejora" esto para mostrar un chip gris de "sin
 * información", estos tests se ponen rojos, y con razón: un hueco se lee como
 * "no sabemos", un chip gris se lee como un estado.
 */

function mk(over: Partial<EstadoDeEstacion> = {}): EstadoDeEstacion {
  return { estado: "disponible", crudo: "Available", conectores: [], ...over };
}

function renderChip(estado: EstadoDeEstacion | null, actualizado: string | null = "2026-09-07T20:00:00Z") {
  return render(
    <LanguageProvider>
      <StationStatusChip estado={estado} actualizado={actualizado} fuente="UTE Movilidad" />
    </LanguageProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("sin dato no se dibuja nada", () => {
  it("no renderiza cuando no hay estado", () => {
    const { container } = renderChip(null);

    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza cuando el estado es desconocido", () => {
    // "desconocido" = la fuente mandó algo que el backend no supo traducir.
    // Es exactamente igual de ignorante que no haber mandado nada.
    const { container } = renderChip(mk({ estado: "desconocido", crudo: "Vaya uno a saber" }));

    expect(container).toBeEmptyDOMElement();
  });
});

describe("cuando hay dato", () => {
  it("muestra el estado con su procedencia", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T20:04:30Z"));

    renderChip(mk());

    expect(screen.getByText("Disponible")).toBeInTheDocument();
    // La procedencia no es opcional: sin ella el chip afirma algo que RouteEV
    // no midió.
    expect(screen.getByText(/según UTE Movilidad, hace 4 min/)).toBeInTheDocument();
  });

  it.each([
    ["ocupado" as const, "En uso"],
    ["fuera_de_servicio" as const, "Fuera de servicio"],
  ])("traduce %s", (estado, etiqueta) => {
    renderChip(mk({ estado }));

    expect(screen.getByText(etiqueta)).toBeInTheDocument();
  });

  it("nunca dice que el dato es de ahora mismo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T20:00:20Z"));

    renderChip(mk());

    // 20 segundos se muestran como "hace menos de 1 min", no como "ahora":
    // un dato reciente que se presenta como instantáneo invita a confiar en él
    // más de lo que corresponde.
    expect(screen.getByText(/hace menos de 1 min/)).toBeInTheDocument();
  });

  it("aguanta que no venga la fecha", () => {
    renderChip(mk(), null);

    expect(screen.getByText(/hace menos de 1 min/)).toBeInTheDocument();
  });
});
