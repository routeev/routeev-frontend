import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Station } from "../api/graph";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { StationsList } from "./StationsList";

vi.mock("../api/stationReviews", () => ({
  listStationReviewSummaries: vi.fn(() => Promise.resolve({})),
}));

const st = (
  node_id: string,
  nombre: string,
  operador: string,
  potencia_kw: number,
  departamento: string
) =>
  ({
    node_id,
    nombre,
    operador,
    potencia_kw,
    departamento,
    lat: -34,
    lon: -56,
    direccion: "",
    tipo_conector: "CCS2",
    nota: "",
  }) as Station;

const STATIONS = [
  st("a", "UTE Paso de los Toros", "UTE", 60, "Tacuarembó"),
  st("b", "Estación Península", "Península EV", 30, "Maldonado"),
  st("c", "UTE Artigas", "UTE", 30, "Artigas"),
];

function renderList(props: Partial<{ loadFailed: boolean; onRetry: () => void }> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <StationsList loadFailed={false} onRetry={() => {}} {...props} />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const nombres = () =>
  within(screen.getByRole("list"))
    .queryAllByRole("button")
    .map((b) => b.textContent ?? "");

describe("StationsList", () => {
  beforeEach(() => {
    localStorage.clear();
    useMapStore.setState({ stations: STATIONS, selectedStationId: null });
  });

  it("lista todas y marca solo las privadas", () => {
    renderList();

    expect(nombres()).toHaveLength(3);
    expect(screen.getByText("3 estaciones · red de UTE y operadores privados")).toBeInTheDocument();
    expect(screen.getAllByText("Privada")).toHaveLength(1);
  });

  it("filtra por rápidas, UTE y privadas", () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: /rápidas/i }));
    expect(nombres()).toEqual([expect.stringContaining("Paso de los Toros")]);

    fireEvent.click(screen.getByRole("button", { name: "Privadas" }));
    expect(nombres()).toEqual([expect.stringContaining("Península")]);

    fireEvent.click(screen.getByRole("button", { name: "UTE" }));
    expect(nombres()).toHaveLength(2);
  });

  it("busca por nombre o por departamento, sin importar los acentos", () => {
    renderList();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tacuarembo" } });
    expect(nombres()).toEqual([expect.stringContaining("Paso de los Toros")]);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "rivera" } });
    expect(screen.getByText("No hay estaciones que coincidan con «rivera».")).toBeInTheDocument();
  });

  it("elegir una abre su detalle", () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: /Estación Península/ }));

    expect(useMapStore.getState().selectedStationId).toBe("b");
  });

  it("si no cargaron, lo dice y deja reintentar", () => {
    const onRetry = vi.fn();
    renderList({ loadFailed: true, onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar las estaciones");
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
