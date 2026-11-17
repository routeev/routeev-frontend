import { beforeEach, describe, expect, it, vi } from "vitest";
import { planRouteMultiple } from "./route";

vi.mock("./client", () => ({ apiFetch: vi.fn() }));
import { apiFetch } from "./client";

describe("planRouteMultiple", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("le pide a /api/route/plan-multiple la ida y vuelta de dos puntos", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ida_y_vuelta: true, tramos: [], resumen: {} });

    const r = await planRouteMultiple({
      puntos: [
        { lat: -34.9, lon: -56.19 },
        { lat: -33.0, lon: -55.0 },
      ],
      ida_y_vuelta: true,
      vehicle_id: 7,
      start_battery_kwh: 40,
    });

    expect(r.ida_y_vuelta).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith("/api/route/plan-multiple", {
      method: "POST",
      body: {
        puntos: [
          { lat: -34.9, lon: -56.19 },
          { lat: -33.0, lon: -55.0 },
        ],
        ida_y_vuelta: true,
        vehicle_id: 7,
        start_battery_kwh: 40,
      },
    });
  });
});
