import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Station } from "../api/graph";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { StationDetailPanel } from "./StationDetailPanel";

// Las secciones que piden datos a la API no son lo que se prueba acá.
vi.mock("./StationReviews", () => ({ StationReviews: () => null }));
vi.mock("./StationStatusReport", () => ({ StationStatusReport: () => null }));
vi.mock("./useStationStatus", () => ({
  useStationStatus: () => ({ datos: null, estadoDe: () => null }),
}));
vi.mock("./pointName", () => ({ nameInBackground: vi.fn(() => Promise.resolve()) }));

const STATION = {
  node_id: "station_ute_ancap_florida",
  nombre: "ANCAP Florida",
  lat: -34.0994,
  lon: -56.2142,
  potencia_kw: 50,
  operador: "UTE",
  direccion: "Ruta 5 km 98",
} as Station;

afterEach(() => {
  vi.unstubAllGlobals();
  useMapStore.setState({
    stations: [],
    selectedStationId: null,
    originNode: null,
    destinationNode: null,
  });
});

describe("StationDetailPanel -- Ir hasta acá desde mi ubicación", () => {
  it("el botón está en el detalle y lleva la estación al destino", () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition: vi.fn((ok) =>
          ok({ coords: { latitude: -34.9058, longitude: -56.1913 } })
        ),
      },
    });
    useMapStore.setState({ stations: [STATION], selectedStationId: STATION.node_id });
    const onCalculate = vi.fn();
    render(
      <LanguageProvider>
        <StationDetailPanel onCalculate={onCalculate} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /ir hasta acá desde mi ubicación/i }));

    expect(useMapStore.getState().destinationNode?.name).toBe("ANCAP Florida");
    expect(useMapStore.getState().originNode).not.toBeNull();
  });
});
