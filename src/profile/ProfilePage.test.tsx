import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "../api/route";
import * as user from "../api/user";
import * as vehicles from "../api/vehicles";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { ProfilePage } from "./ProfilePage";

vi.mock("../api/vehicles", () => ({
  listVehicles: vi.fn(),
  listEvModels: vi.fn(),
  createVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  uploadVehiclePhoto: vi.fn(),
  deleteVehiclePhoto: vi.fn(),
  lookupVehicleAiPhoto: vi.fn(),
  vehiclePhotoUrl: vi.fn(),
}));

vi.mock("../api/route", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/route")>()),
  getHistory: vi.fn(),
  getMonthlyStats: vi.fn(),
  getVehicleStats: vi.fn(),
}));

vi.mock("../api/user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/user")>()),
  getMe: vi.fn(),
  updateMyDisplayName: vi.fn(),
  requestMyEmailChange: vi.fn(),
  confirmMyEmailChange: vi.fn(),
  changeMyPassword: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

const ME = { username: "marcela", display_name: "Marcela Pérez", email: "marcela@gmail.com" };
const DOLPHIN = {
  id: 1,
  name: "BYD Dolphin",
  battery_capacity_kwh: 44.9,
  consumption_kwh_per_km: 0.169,
  charging_power_kw: 60,
  has_photo: false,
  foto_modelo_url: "https://example.com/dolphin.jpg",
  foto_modelo_credito: { autor: "User 3204", licencia: "CC BY-SA 4.0" },
};
const HOME_CAR = {
  id: 3,
  name: "El auto de casa",
  battery_capacity_kwh: 50,
  consumption_kwh_per_km: 0.17,
  charging_power_kw: 50,
  has_photo: false,
};
const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

function renderProfile(path = "/profile") {
  const router = createMemoryRouter(
    [
      { path: "/profile", element: <ProfilePage /> },
      { path: "/", element: <p>Inicio</p> },
    ],
    { initialEntries: [path] }
  );
  render(
    <HelmetProvider>
      <LanguageProvider>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <RouterProvider router={router} />
        </QueryClientProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
  return router;
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("routeev_token", "tok");
    localStorage.setItem("routeev_username", "marcela");
    vi.mocked(user.getMe).mockResolvedValue(ME as user.Me);
    vi.mocked(vehicles.listVehicles).mockResolvedValue([DOLPHIN, HOME_CAR] as vehicles.Vehicle[]);
    vi.mocked(vehicles.listEvModels).mockResolvedValue([
      {
        marca: "BYD",
        modelo: "Seal",
        bateria_kwh: 61.4,
        consumo_kwh_km: 0.15,
        potencia_carga_kw: 110,
        autonomia_aprox_km: 409,
      },
    ]);
    vi.mocked(route.getHistory).mockResolvedValue([
      {
        id: 1,
        created_at: "2026-09-02T09:10:00Z",
        origin_name: "Salto",
        destination_name: "Artigas",
        vehicle_id: 3,
        distance_km: null,
        energy_kwh: null,
        trip_time_min: null,
        costo_uyu_total: null,
        recharge_count: 0,
      },
      {
        id: 2,
        created_at: "2026-10-12T18:20:00Z",
        origin_name: "Montevideo",
        destination_name: "Rivera",
        vehicle_id: 1,
        start_battery_kwh: 44.9,
        distance_km: 497.3,
        energy_kwh: 84.1,
        trip_time_min: 375,
        costo_uyu_total: 740,
        recharge_count: 1,
      },
    ] as route.HistoryEntry[]);
    vi.mocked(route.getMonthlyStats).mockResolvedValue([
      {
        month: thisMonth,
        trip_count: 2,
        total_distance_km: 632.1,
        total_energy_kwh: 106.9,
        total_cost_uyu: 916,
        total_recharges: 1,
        avg_distance_km: 316,
        avg_cost_uyu: 458,
      },
      {
        month: "2020-09",
        trip_count: 1,
        total_distance_km: 177.6,
        total_energy_kwh: 29.5,
        total_cost_uyu: 231,
        total_recharges: 1,
        avg_distance_km: 177.6,
        avg_cost_uyu: 231,
      },
    ]);
    vi.mocked(route.getVehicleStats).mockResolvedValue([
      {
        vehicle_name: "BYD Dolphin",
        trip_count: 2,
        total_distance_km: 632.1,
        total_energy_kwh: 106.9,
        total_cost_uyu: 916,
        cost_uyu_per_km: 1.449,
        total_recharges: 1,
      },
      {
        vehicle_name: "Nissan Leaf (40 kWh)",
        trip_count: 1,
        total_distance_km: 177.6,
        total_energy_kwh: 29.5,
        total_cost_uyu: 231,
        cost_uyu_per_km: 1.3,
        total_recharges: 1,
      },
    ]);
  });

  it("autos primero, con la autonomía como cifra grande y el crédito de la foto del catálogo", async () => {
    renderProfile();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Marcela Pérez" })
    ).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings.slice(0, 4)).toEqual([
      "Mis autos",
      "Viajes y gasto",
      "Mi cuenta",
      "Eliminar cuenta",
    ]);
    const cars = document.getElementById("autos")!;
    expect(await within(cars).findByText("BYD Dolphin")).toBeInTheDocument();
    // 44,9 kWh ÷ 0,169 kWh/km.
    expect(within(cars).getByText("266")).toBeInTheDocument();
    expect(
      within(cars).getByText("Foto de referencia · User 3204 · CC BY-SA 4.0")
    ).toBeInTheDocument();
  });

  it("eliminar un auto pide confirmación propia, con el foco en Cancelar", async () => {
    vi.mocked(vehicles.deleteVehicle).mockResolvedValue(undefined);
    renderProfile();
    fireEvent.click(await screen.findByRole("button", { name: "Más opciones para BYD Dolphin" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem")[0]).toHaveFocus();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Eliminar auto" }));

    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar «BYD Dolphin»?" });
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar auto" }));
    await waitFor(() => expect(vehicles.deleteVehicle).toHaveBeenCalled());
    expect(vi.mocked(vehicles.deleteVehicle).mock.calls[0]![0]).toBe(1);
  });

  it("?agregar-vehiculo=1 abre el alta: catálogo → revisar los datos → agregar", async () => {
    vi.mocked(vehicles.createVehicle).mockResolvedValue({
      ...HOME_CAR,
      id: 9,
      name: "BYD Seal",
    } as vehicles.Vehicle);
    renderProfile("/profile?agregar-vehiculo=1");
    const dialog = await screen.findByRole("dialog", { name: "Agregar un auto" });
    const search = within(dialog).getByRole("combobox", { name: "Buscá el modelo" });
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "seal" } });
    const option = await within(dialog).findByRole("option", { name: /BYD Seal/ });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(option).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(search, { key: "Enter" });

    expect(within(dialog).getByText("Paso 2 de 2 · Revisá los datos")).toBeInTheDocument();
    // Con coma, como se escribe acá; y la autonomía estimada en vivo.
    expect(within(dialog).getByLabelText("Batería")).toHaveValue("61,4");
    expect(within(dialog).getByText("409")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar a mis autos" }));

    await waitFor(() =>
      expect(vehicles.createVehicle).toHaveBeenCalledWith({
        name: "BYD Seal",
        battery_capacity_kwh: 61.4,
        consumption_kwh_per_km: 0.15,
        charging_power_kw: 110,
      })
    );
  });

  it("a mano: valida al guardar, avisa el nombre repetido y lleva el foco al primer error", async () => {
    renderProfile("/profile?agregar-vehiculo=1");
    const dialog = await screen.findByRole("dialog", { name: "Agregar un auto" });
    // Que ya estén los autos, para comparar el nombre.
    await screen.findAllByText("El auto de casa");
    fireEvent.click(within(dialog).getByRole("button", { name: /Completar a mano/ }));
    type("Nombre", "el auto de casa");
    type("Consumo", "0");
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar a mis autos" }));

    const name = within(dialog).getByLabelText("Nombre");
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription(/Ya tenés un auto con ese nombre/);
    expect(within(dialog).getByLabelText("Batería")).toHaveAttribute("aria-invalid", "true");
    expect(vehicles.createVehicle).not.toHaveBeenCalled();
  });

  it("viajes y gasto sin tablas: este mes, el costo por km con dos decimales y el viaje sin ruta", async () => {
    renderProfile();
    expect(await screen.findByText(/^Este mes ·/)).toBeInTheDocument();
    expect(screen.getAllByText("632")).toHaveLength(2);
    expect(screen.getByText(/\$U 1,45 por km/)).toBeInTheDocument();

    const previous = screen.getByRole("button", { name: /Septiembre 2020/ });
    expect(previous).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(previous);
    expect(screen.getByText("Costo por km")).toBeInTheDocument();
    expect(screen.getByText("$U 1,30")).toBeInTheDocument();

    expect(screen.getByText("Sin ruta")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver en el mapa el viaje de Montevideo a Rivera" })
    ).toHaveAttribute("href", "/app?viaje=2");
  });

  it("cambiar el correo es en dos pasos y el código llega al correo nuevo", async () => {
    vi.mocked(user.requestMyEmailChange).mockResolvedValue({
      confirmation_required: true,
      new_email: "marcela.perez@gmail.com",
    });
    vi.mocked(user.confirmMyEmailChange).mockResolvedValue({
      ...ME,
      email: "marcela.perez@gmail.com",
    } as user.Me);
    renderProfile();
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar correo" }));
    expect(screen.getByText("Paso 1 de 2")).toBeInTheDocument();
    type("Correo nuevo", "marcela.perez@gmail.com");
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByText("Paso 2 de 2")).toBeInTheDocument();
    expect(screen.getByText("marcela.perez@gmail.com", { selector: "strong" })).toBeInTheDocument();
    type("Código de 6 dígitos", "48 29 13");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(user.confirmMyEmailChange).toHaveBeenCalledWith("482913"));
  });

  it("contraseña: valida que coincidan antes de mandar", async () => {
    renderProfile();
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar contraseña" }));
    type("Contraseña actual", "clave-vieja-1");
    type("Contraseña nueva", "ruta-a-rivera");
    type("Repetí la contraseña nueva", "ruta-a-punta");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByLabelText("Repetí la contraseña nueva")).toHaveAccessibleDescription(
      "Las contraseñas no coinciden."
    );
    expect(user.changeMyPassword).not.toHaveBeenCalled();
  });

  it("eliminar la cuenta pide un segundo paso y después cierra la sesión", async () => {
    vi.mocked(user.deleteMyAccount).mockResolvedValue(undefined);
    const router = renderProfile();
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar mi cuenta" }));
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar mi cuenta" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(localStorage.getItem("routeev_token")).toBeNull();
  });
});
