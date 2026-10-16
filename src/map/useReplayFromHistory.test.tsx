import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "../api/route";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMapStore } from "./mapStore";
import { useReplayFromHistory } from "./useReplayFromHistory";

vi.mock("../api/route", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/route")>()),
  getHistory: vi.fn(),
}));

const TRIP = {
  id: 7,
  created_at: "2026-10-12T18:20:00Z",
  origin_name: "Montevideo",
  destination_name: "Rivera",
  vehicle_id: 1,
  distance_km: 497,
  energy_kwh: 84,
  trip_time_min: 375,
  costo_uyu_total: 740,
  recharge_count: 1,
  result: {
    astar: {
      found: true,
      route_coords: [
        [-34.9, -56.2],
        [-30.9, -55.5],
      ],
    },
    dijkstra: null,
  },
} as unknown as route.HistoryEntry;

function wrapper(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <LanguageProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

describe("useReplayFromHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMapStore.getState().resetTripPlanning();
    vi.mocked(route.getHistory).mockResolvedValue([TRIP]);
  });

  it("/app?viaje=<id> busca ese viaje en el historial y lo dibuja con sus extremos", async () => {
    renderHook(() => useReplayFromHistory(true), { wrapper: wrapper("/app?viaje=7") });
    await waitFor(() => expect(useMapStore.getState().lastResult).not.toBeNull());
    expect(useMapStore.getState().lastResult?.origin.name).toBe("Montevideo");
    expect(useMapStore.getState().destinationNode?.name).toBe("Rivera");
  });

  it("sin ?viaje no pide el historial", () => {
    renderHook(() => useReplayFromHistory(true), { wrapper: wrapper("/app") });
    expect(route.getHistory).not.toHaveBeenCalled();
    expect(useMapStore.getState().lastResult).toBeNull();
  });
});
