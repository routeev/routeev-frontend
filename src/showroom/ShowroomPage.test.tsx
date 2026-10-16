import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api/showroom";
import type { ShowroomFicha, ShowroomModel, SimulateResponse } from "../api/showroom";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { ShowroomPage } from "./ShowroomPage";

vi.mock("../api/showroom", () => ({
  showroomModels: vi.fn(),
  showroomModel: vi.fn(),
  showroomImage: vi.fn(() => Promise.resolve({ encontrada: false })),
  showroomLookupAi: vi.fn(),
  showroomDestinos: vi.fn(),
  showroomSimulate: vi.fn(),
}));
vi.mock("../api/auth", () => ({
  authConfig: vi.fn(() => Promise.resolve({ ai_vehicle_lookup_enabled: true })),
}));
// El mapa de la simulación (leaflet) no hace falta acá: se prueba el resto.
vi.mock("./simulationMapLoader", () => ({
  cargarSimulationMap: () => Promise.resolve({ SimulationMap: () => null }),
}));

function model(
  overrides: Partial<ShowroomModel> & Pick<ShowroomModel, "id" | "marca" | "modelo">
): ShowroomModel {
  return {
    bateria_kwh: 50,
    autonomia_aprox_km: 300,
    potencia_carga_kw: 100,
    consumo_kwh_km: 0.16,
    fuente: "catalogo",
    linea: overrides.modelo,
    version: "",
    ...overrides,
  };
}

const MODELS: ShowroomModel[] = [
  model({
    id: "byd-dolphin",
    marca: "BYD",
    modelo: "Dolphin",
    autonomia_aprox_km: 266,
    nombres_locales: ["E2"],
  }),
  model({
    id: "byd-dolphin-60",
    marca: "BYD",
    modelo: "DOLPHIN (60.4 kWh)",
    linea: "Dolphin",
    version: "60,4 kWh",
    bateria_kwh: 60.4,
    autonomia_aprox_km: 350,
    potencia_carga_kw: 88,
  }),
  model({
    id: "byd-seal",
    marca: "BYD",
    modelo: "Seal",
    autonomia_aprox_km: 410,
    potencia_carga_kw: 150,
  }),
  model({
    id: "byd-mini",
    marca: "BYD",
    modelo: "Seagull",
    autonomia_aprox_km: 230,
    potencia_carga_kw: 40,
  }),
  model({ id: "rr-spectre", marca: "Rolls-Royce", modelo: "Spectre", autonomia_aprox_km: 466 }),
  // Una marca grande, para las destacadas (8 modelos o más).
  ...Array.from({ length: 8 }, (_, i) =>
    model({
      id: `audi-${i}`,
      marca: "Audi",
      modelo: `Q${i + 1} e-tron`,
      autonomia_aprox_km: 300 + i,
    })
  ),
];

function ficha(m: ShowroomModel): ShowroomFicha {
  return {
    model: m,
    metricas: {
      autonomia_calculada_km: m.autonomia_aprox_km,
      consumo_kwh_100km: m.consumo_kwh_km * 100,
      costo_uyu_100km: 104,
      energia_uyu_kwh: 6.5,
      costo_carga_completa_uyu: 325,
      carga_desde_pct: 10,
      carga_hasta_pct: 80,
      carga_km_recuperados: 210,
      estaciones_red: 211,
      carga: [
        {
          potencia_kw: 60,
          estaciones: 102,
          potencia_efectiva_kw: 60,
          minutos: 42,
          modalidad: "DC",
          costo_uyu: 633,
        },
      ],
    },
  };
}

const SIMULATION: SimulateResponse = {
  margen_bateria_pct: 10,
  resultados: [
    {
      llega: true,
      tiempo_total_min: 415,
      bateria_llegada_pct: 24.2,
      costo_uyu: 1497,
      paradas: [],
      detalle: {
        distancia_km: 507,
        conduccion_min: 374,
        trafico_min: 0,
        recarga_min: 40,
        energia_kwh: 87,
        costo_uyu_energia: 320,
        peaje_uyu: 590,
        peajes: 3,
        tramos: [],
      },
    },
  ],
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>landing</p> },
      { path: "/showroom/:marca?/:linea?", element: <ShowroomPage /> },
    ],
    { initialEntries: [path] }
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <HelmetProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
  return router;
}

describe("ShowroomPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.showroomModels).mockResolvedValue({ models: MODELS });
    vi.mocked(api.showroomModel).mockImplementation((id) =>
      Promise.resolve(ficha(MODELS.find((m) => m.id === id)!))
    );
    vi.mocked(api.showroomDestinos).mockResolvedValue([
      { id: "mvd", nombre: "Montevideo", departamento: "Montevideo" },
      { id: "riv", nombre: "Rivera", departamento: "Rivera" },
    ]);
    vi.mocked(api.showroomSimulate).mockReset().mockResolvedValue(SIMULATION);
  });

  describe("índice de marcas", () => {
    it("un solo h1, las marcas grandes destacadas y todas de la A a la Z", async () => {
      renderAt("/showroom");
      expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
        "Buscá tu auto eléctrico y mirá sus números de verdad."
      );
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

      const featured = screen
        .getByRole("heading", { name: "Las que más modelos tienen" })
        .closest("section")!;
      expect(
        within(featured)
          .getAllByRole("link")
          .map((a) => a.getAttribute("href"))
      ).toEqual(["/showroom/audi"]);
      expect(
        screen.getByRole("heading", { name: "Las 3 marcas, de la A a la Z" })
      ).toBeInTheDocument();
    });

    it("una marca con un solo modelo va directo a su ficha, con el nombre del modelo", async () => {
      renderAt("/showroom");
      const row = await screen.findByRole("link", { name: /Rolls-Royce/ });
      expect(row).toHaveAttribute("href", "/showroom/rolls-royce/spectre");
      expect(row).toHaveTextContent("Spectre");
    });

    it("las letras sin marcas quedan deshabilitadas", async () => {
      renderAt("/showroom");
      expect(await screen.findByRole("button", { name: "Marcas con A" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Marcas con Z" })).toBeDisabled();
    });
  });

  describe("búsqueda", () => {
    it("los resultados reemplazan al índice y la búsqueda queda en la URL", async () => {
      const router = renderAt("/showroom");
      fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "dolphin" } });

      expect(
        await screen.findByRole("heading", { name: "Resultados para «dolphin»" })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /BYD Dolphin/ })).toHaveAttribute(
        "href",
        "/showroom/byd/dolphin"
      );
      expect(
        screen.queryByRole("heading", { name: "Las que más modelos tienen" })
      ).not.toBeInTheDocument();
      await waitFor(() => expect(router.state.location.search).toBe("?q=dolphin"));
    });

    it("encuentra el auto por el nombre con el que se lo conoce acá", async () => {
      renderAt("/showroom?q=e2");
      expect(await screen.findByRole("link", { name: /BYD Dolphin/ })).toBeInTheDocument();
    });

    it("si coincide con una marca, la ofrece arriba", async () => {
      renderAt("/showroom?q=byd");
      expect(await screen.findByRole("link", { name: /Marca\s*BYD/ })).toHaveAttribute(
        "href",
        "/showroom/byd"
      );
    });

    it("sin resultados ofrece buscarlo con IA", async () => {
      renderAt("/showroom?q=neta");
      expect(await screen.findByText("No encontramos «neta» en el catálogo.")).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: "Identificar «neta»" })).toBeInTheDocument();
    });

    it("borrar la búsqueda vuelve al índice", async () => {
      const router = renderAt("/showroom?q=dolphin");
      fireEvent.click(await screen.findByRole("button", { name: "Borrar búsqueda" }));
      expect(
        await screen.findByRole("heading", { name: "Las que más modelos tienen" })
      ).toBeInTheDocument();
      await waitFor(() => expect(router.state.location.search).toBe(""));
    });
  });

  describe("página de una marca", () => {
    it("sus modelos ordenados por autonomía, y el filtro de carga rápida", async () => {
      renderAt("/showroom/byd");
      expect(await screen.findByRole("heading", { level: 1, name: "BYD" })).toBeInTheDocument();
      expect(screen.getByText("3 modelos · 4 versiones")).toBeInTheDocument();

      const names = () =>
        screen.getAllByRole("link", { name: /^BYD / }).map((a) => a.getAttribute("aria-label"));
      expect(names()[0]).toMatch(/^BYD Seal/);

      fireEvent.click(screen.getByRole("switch", { name: /Solo carga rápida/ }));
      expect(screen.getByText("2 de 3 modelos")).toBeInTheDocument();
      expect(names().some((n) => n?.startsWith("BYD Seagull"))).toBe(false);
    });

    it("ordenar por consumo es de menor a mayor", async () => {
      renderAt("/showroom/byd");
      fireEvent.click(await screen.findByRole("radio", { name: "Consumo" }));
      expect(screen.getByRole("radio", { name: "Consumo" })).toHaveAttribute(
        "aria-checked",
        "true"
      );
    });

    it("una marca que no existe lo dice, con salida al índice", async () => {
      renderAt("/showroom/no-existe");
      expect(
        await screen.findByRole("heading", { name: "No encontramos esa marca." })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Ver todas las marcas/ })).toHaveAttribute(
        "href",
        "/showroom"
      );
    });
  });

  describe("ficha", () => {
    it("abre con la versión de más autonomía y cambiar de versión va a ?v=", async () => {
      const router = renderAt("/showroom/byd/dolphin");
      expect(
        await screen.findByRole("heading", { level: 1, name: "BYD Dolphin" })
      ).toBeInTheDocument();
      expect(screen.getByText("Acá también se lo conoce como E2.")).toBeInTheDocument();

      const versions = screen.getByRole("radiogroup", { name: /Viene en 2 versiones/ });
      expect(within(versions).getByRole("radio", { checked: true })).toHaveTextContent("60,4 kWh");

      fireEvent.click(within(versions).getByRole("radio", { name: /Base/ }));
      await waitFor(() => expect(router.state.location.search).toBe("?v=byd-dolphin"));
      expect(within(versions).getByRole("radio", { checked: true })).toHaveTextContent("Base");
    });

    it("los costos y la tabla de carga llegan con la ficha de la versión", async () => {
      renderAt("/showroom/byd/dolphin");
      expect(await screen.findByText("A precio de casa: $U 6,50 el kWh.")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Cargar del 10 % al 80 %/ })).toBeInTheDocument();
      expect(api.showroomModel).toHaveBeenCalledWith("byd-dolphin-60");
    });

    it("los links viejos ?modelo=<id> llevan a la ficha nueva con esa versión", async () => {
      const router = renderAt("/showroom?modelo=byd-dolphin");
      await waitFor(() => expect(router.state.location.pathname).toBe("/showroom/byd/dolphin"));
      expect(router.state.location.search).toBe("?v=byd-dolphin");
    });

    it("un modelo que no existe lo dice", async () => {
      renderAt("/showroom/byd/no-existe");
      expect(
        await screen.findByRole("heading", { name: "No encontramos ese modelo." })
      ).toBeInTheDocument();
    });
  });

  describe("simulación", () => {
    it("calcula solo con el botón, y cambiar un dato marca el resultado como viejo", async () => {
      renderAt("/showroom/byd/dolphin");
      const submit = await screen.findByRole("button", { name: "Calcular viaje" });
      await waitFor(() => expect(screen.getByLabelText("Hasta")).toHaveValue("riv"));

      fireEvent.click(screen.getByRole("button", { name: "Menos batería" }));
      expect(api.showroomSimulate).not.toHaveBeenCalled();

      fireEvent.click(submit);
      expect(await screen.findByText("Llegás con")).toBeInTheDocument();
      expect(api.showroomSimulate).toHaveBeenCalledTimes(1);
      expect(api.showroomSimulate).toHaveBeenCalledWith({
        origin_id: "mvd",
        destination_id: "riv",
        model_ids: ["byd-dolphin-60"],
        bateria_inicial_pct: 90,
        ida_y_vuelta: false,
      });
      expect(screen.getByText("Con margen")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Volver a calcular" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("switch", { name: /Ida y vuelta/ }));
      expect(
        screen.getByText("Cambiaste datos: esto es del cálculo anterior.")
      ).toBeInTheDocument();
      expect(api.showroomSimulate).toHaveBeenCalledTimes(1);
    });

    it("no simula con el mismo origen y destino", async () => {
      renderAt("/showroom/byd/dolphin");
      await waitFor(() => expect(screen.getByLabelText("Hasta")).toHaveValue("riv"));
      fireEvent.click(screen.getByRole("button", { name: "Invertir origen y destino" }));
      fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "riv" } });
      fireEvent.click(screen.getByRole("button", { name: "Calcular viaje" }));
      expect(await screen.findByText("Elegí un destino distinto del origen.")).toBeInTheDocument();
      expect(api.showroomSimulate).not.toHaveBeenCalled();
    });
  });
});
