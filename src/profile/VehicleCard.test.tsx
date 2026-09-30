import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Vehicle } from "../api/vehicles";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { VehicleCard } from "./VehicleCard";

// La foto propia se pide con token a la API: acá se mockea el módulo entero.
vi.mock("../api/vehicles", () => ({
  vehiclePhotoUrl: vi.fn(() => Promise.resolve("blob:foto-propia")),
}));

const BASE: Vehicle = {
  id: 7,
  name: "Nissan Leaf 40 kWh",
  battery_capacity_kwh: 40,
  consumption_kwh_per_km: 0.166,
  charging_power_kw: 50,
};

const FOTO_MODELO = "https://api.routeev.uy/api/showroom/models/nissan-leaf-40/foto";
const CREDITO = {
  autor: "Alexander Migl",
  licencia: "CC BY-SA 4.0",
  archivo_url: "https://commons.wikimedia.org/wiki/File:Nissan_Leaf.jpg",
};

function renderCard(vehicle: Vehicle) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <VehicleCard
          vehicle={vehicle}
          busy={false}
          onUploadPhoto={vi.fn()}
          onRemovePhoto={vi.fn()}
          onDelete={vi.fn()}
        />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("VehicleCard -- foto por defecto", () => {
  it("sin foto propia muestra la del modelo, con su crédito enlazado", () => {
    const { container } = renderCard({
      ...BASE,
      foto_modelo_url: FOTO_MODELO,
      foto_modelo_credito: CREDITO,
    });

    expect(container.querySelector("img")?.getAttribute("src")).toBe(FOTO_MODELO);
    const credito = screen.getByRole("link", {
      name: /Foto de referencia · Alexander Migl · CC BY-SA 4.0/,
    });
    expect(credito).toHaveAttribute("href", CREDITO.archivo_url);
  });

  it("con foto propia usa esa y no la del modelo, ni siquiera mientras carga", async () => {
    const { container } = renderCard({
      ...BASE,
      has_photo: true,
      foto_modelo_url: FOTO_MODELO,
      foto_modelo_credito: CREDITO,
    });

    // Antes de que llegue la propia: nada de la del modelo (si no, parpadea).
    expect(container.querySelector(`img[src="${FOTO_MODELO}"]`)).toBeNull();
    await vi.waitFor(() =>
      expect(container.querySelector("img")?.getAttribute("src")).toBe("blob:foto-propia")
    );
    expect(screen.queryByText(/Foto de referencia/)).toBeNull();
  });

  it("un nombre que no es de catálogo sigue con la silueta", () => {
    const { container } = renderCard({
      ...BASE,
      name: "El auto de la familia",
      foto_modelo_url: null,
    });

    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText(/Foto de referencia/)).toBeNull();
  });
});
