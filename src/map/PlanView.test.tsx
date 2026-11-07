import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Vehicle } from "../api/vehicles";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { PlanView } from "./PlanView";
import { fromCoords } from "./routePoint";

vi.mock("../api/graph", () => ({
  getLocalidades: vi.fn(() => Promise.resolve({ localidades: [] })),
  geocode: vi.fn(),
}));

const TESLA = {
  id: 1,
  name: "Tesla Model 3",
  battery_capacity_kwh: 57.5,
  consumption_kwh_per_km: 0.137,
  charging_power_kw: 170,
} as Vehicle;

const CALC = { calculate: vi.fn(), isPending: false, startedAt: 0, error: null };

function renderPlan(calc = CALC) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <MemoryRouter>
          <PlanView calc={calc} mapNotice={null} loadFailed={[]} onRetryLoad={() => {}} />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function listoMenosLaPregunta() {
  const s = useMapStore.getState();
  s.resetTripPlanning();
  s.setVehicles([TESLA]);
  s.selectVehicle(TESLA.id);
  s.setStartBatteryPct(80);
  s.setOrigin(fromCoords(-34.9055, -56.1851));
  s.setDestination(fromCoords(-30.905, -55.55));
}

describe("PlanView", () => {
  beforeEach(() => {
    localStorage.clear();
    listoMenosLaPregunta();
  });

  it("sin destino no hace las preguntas: no tienen sujeto", () => {
    useMapStore.getState().clearDestination();
    renderPlan();
    expect(screen.queryByRole("radiogroup", { name: /dónde cargar en el destino/i })).toBeNull();
  });

  it("no ofrece calcular hasta que se contesta si hay dónde cargar en el destino", () => {
    renderPlan();

    expect(
      screen.getByText("Para calcular la ruta, contanos si tenés dónde cargar al llegar.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /calcular ruta/i })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "No tengo" }));

    expect(useMapStore.getState().cargadorEnDestino).toBe(false);
    expect(screen.getByRole("radio", { name: "No tengo" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: /calcular ruta/i })).toBeInTheDocument();
    expect(
      screen.getByText("Te mostramos el cargador más cercano al destino y llegás con margen.")
    ).toBeInTheDocument();
  });

  // Lo reportado el 5/11/2026: sin contestar la pregunta no hay ningún botón a la
  // vista, y lo único que lo explicaba era una frase gris. Quien conoce la app se
  // trabó ahí, así que quien no la conoce también.
  describe("la pregunta de la que depende calcular", () => {
    const preguntaDelCargador = () =>
      screen.getByRole("radiogroup", { name: /dónde cargar en el destino/i }).parentElement!;

    it("se resalta mientras falta contestarla, y dice para qué hace falta", () => {
      renderPlan();

      expect(preguntaDelCargador()).toHaveAttribute("data-pending", "true");
      expect(
        screen.getByText("Para calcular la ruta, contanos si tenés dónde cargar al llegar.")
      ).toBeInTheDocument();
    });

    it("deja de resaltarse apenas se contesta", () => {
      renderPlan();

      fireEvent.click(screen.getByRole("radio", { name: "Sí, tengo" }));

      expect(preguntaDelCargador()).not.toHaveAttribute("data-pending");
    });

    // En la web de celular la pregunta queda debajo de la hoja: resaltada, pero
    // fuera de la pantalla. Comprobado el 5/11/2026 en 375x812.
    it("se lleva a la vista cuando pasa a ser lo que falta, y una sola vez", () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      useMapStore.getState().clearDestination();
      renderPlan();
      expect(scroll).not.toHaveBeenCalled();

      act(() => useMapStore.getState().setDestination(fromCoords(-30.905, -55.55)));

      expect(scroll).toHaveBeenCalledTimes(1);
      expect(scroll.mock.calls[0]![0]).toMatchObject({ block: "nearest" });
      expect(scroll.mock.contexts[0]).toBe(preguntaDelCargador());

      act(() => useMapStore.getState().setStartBatteryPct(50));

      expect(scroll).toHaveBeenCalledTimes(1);
    });

    it("no mueve nada si lo que falta es otra cosa", () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      useMapStore.getState().selectVehicle(null);
      renderPlan();

      expect(scroll).not.toHaveBeenCalled();
    });

    it("no se resalta si lo que falta es otra cosa", () => {
      useMapStore.getState().selectVehicle(null);
      renderPlan();

      expect(preguntaDelCargador()).not.toHaveAttribute("data-pending");
    });
  });

  it("calcular llama al cálculo de MapPage", () => {
    useMapStore.getState().setCargadorEnDestino(true);
    const calc = { ...CALC, calculate: vi.fn() };
    renderPlan(calc);

    fireEvent.click(screen.getByRole("button", { name: /calcular ruta/i }));

    expect(calc.calculate).toHaveBeenCalled();
  });

  it("los botones de batería van de 5 en 5, también desde un valor tipeado", () => {
    useMapStore.getState().setStartBatteryPct(37);
    renderPlan();

    fireEvent.click(screen.getByRole("button", { name: "Subir 5 %" }));
    expect(useMapStore.getState().startBatteryPct).toBe(40);

    fireEvent.click(screen.getByRole("button", { name: "Bajar 5 %" }));
    fireEvent.click(screen.getByRole("button", { name: "Bajar 5 %" }));
    expect(useMapStore.getState().startBatteryPct).toBe(30);
  });

  it("sin vehículos cargados invita a agregar uno", () => {
    useMapStore.getState().setVehicles([]);
    renderPlan();

    expect(screen.getByText("Todavía no cargaste ningún auto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /agregar un auto/i })).toHaveAttribute(
      "href",
      "/profile?agregar-vehiculo=1"
    );
  });
});
