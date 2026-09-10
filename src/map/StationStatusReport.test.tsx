import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StationStatusReport as Report, StationStatusReportsPayload } from "../api/stationStatusReports";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { StationStatusReport } from "./StationStatusReport";

// Mismo criterio que StationReviews.test.tsx: el módulo entero se mockea,
// el test no toca red ni token.
vi.mock("../api/stationStatusReports", () => ({
  getStationStatusReports: vi.fn(),
  reportStationStatus: vi.fn(),
}));

const api = await import("../api/stationStatusReports");

function mkReport(over: Partial<Report> = {}): Report {
  return { id: 1, estado: "funciona", created_at: new Date().toISOString(), ...over };
}

function mockPayload(reportes: Report[]) {
  const payload: StationStatusReportsPayload = { reportes, vigente_horas: 6 };
  vi.mocked(api.getStationStatusReports).mockResolvedValue(payload);
}

function renderComponent() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <StationStatusReport nodeId="n123" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("StationStatusReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin reportes vigentes lo dice, en vez de una lista vacía muda", async () => {
    mockPayload([]);
    renderComponent();

    expect(await screen.findByText("Nadie reportó esta estación en las últimas horas.")).toBeInTheDocument();
  });

  it("lista los reportes vigentes, más nuevo primero (como los devuelve la API)", async () => {
    mockPayload([mkReport({ id: 2, estado: "ocupado" }), mkReport({ id: 1, estado: "funciona" })]);
    renderComponent();

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Ocupado");
    expect(items[1]).toHaveTextContent("Funciona");
  });

  it("tocar «No funciona» reporta ese estado y refresca la lista", async () => {
    mockPayload([]);
    vi.mocked(api.reportStationStatus).mockResolvedValue(mkReport({ id: 9, estado: "no_funciona" }));
    renderComponent();

    await screen.findByText("Nadie reportó esta estación en las últimas horas.");
    fireEvent.click(screen.getByRole("button", { name: "No funciona" }));

    await waitFor(() => expect(api.reportStationStatus).toHaveBeenCalledWith("n123", "no_funciona"));
    // El mock de refetch trae la misma respuesta vacía: alcanza con
    // confirmar que se volvió a pedir la lista, no reventar en un loop.
    await waitFor(() => expect(api.getStationStatusReports).toHaveBeenCalledTimes(2));
  });

  it("un error al reportar se avisa, no se traga en silencio", async () => {
    mockPayload([]);
    vi.mocked(api.reportStationStatus).mockRejectedValue(new Error("500"));
    renderComponent();

    fireEvent.click(await screen.findByRole("button", { name: "Funciona" }));

    expect(await screen.findByText("No se pudo enviar el reporte.")).toBeInTheDocument();
  });
});
