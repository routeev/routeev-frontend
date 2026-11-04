import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
vi.mock("../api/stationReviews", () => ({ listStationReviewSummaries: vi.fn(() => Promise.resolve({})) }));

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
    const onGoTo = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LanguageProvider>
          <StationDetailPanel onCalculate={onCalculate} onGoTo={onGoTo} />
        </LanguageProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /ir hasta acá desde mi ubicación/i }));

    expect(useMapStore.getState().destinationNode?.name).toBe("ANCAP Florida");
    expect(useMapStore.getState().originNode).not.toBeNull();
    // El destino es un cargador: la pregunta queda contestada sola, y el
    // panel pasa a la pestaña Viaje para mostrar el resultado.
    expect(useMapStore.getState().cargadorEnDestino).toBe(true);
    expect(onGoTo).toHaveBeenCalled();
  });
});

describe("StationDetailPanel -- con qué se paga", () => {
  function renderCon(station: Station) {
    useMapStore.setState({ stations: [station], selectedStationId: station.node_id });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LanguageProvider>
          <StationDetailPanel onCalculate={vi.fn()} onGoTo={vi.fn()} />
        </LanguageProvider>
      </QueryClientProvider>
    );
  }

  it("muestra la app y los dos links de tienda", () => {
    renderCon({
      ...STATION,
      pago: {
        app: "UTE Mueve",
        android_url: "https://play.google.com/store/apps/details?id=movilidad.ute.com.ute_movilidad_app",
        ios_url: "https://apps.apple.com/uy/app/id1463591379",
      },
    } as Station);

    expect(screen.getByText("Se paga con")).toBeTruthy();
    expect(screen.getByText(/UTE Mueve/)).toBeTruthy();
    const android = screen.getByRole("link", { name: "Android" });
    expect(android.getAttribute("href")).toContain("play.google.com");
    // Sale de la app: pestaña nueva, y sin pasarle window.opener a la tienda.
    expect(android.getAttribute("target")).toBe("_blank");
    expect(android.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("link", { name: "iPhone" }).getAttribute("href")).toContain("apps.apple.com");
  });

  it("sin datos de pago no muestra la fila: null es 'no sabemos', no 'gratis'", () => {
    renderCon({ ...STATION, pago: null } as Station);
    expect(screen.queryByText("Se paga con")).toBeNull();
    expect(screen.queryByRole("link", { name: "Android" })).toBeNull();
  });
});
