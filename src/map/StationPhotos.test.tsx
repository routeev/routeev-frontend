import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StationGallery, StationPhoto } from "../api/stationPhotos";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { StationPhotos } from "./StationPhotos";

vi.mock("../api/stationPhotos", () => ({
  getStationPhotos: vi.fn(),
  uploadStationPhoto: vi.fn(),
  deleteStationPhoto: vi.fn(),
  reportStationPhoto: vi.fn(),
  stationPhotoBlobUrl: vi.fn(async (path: string) => `blob:${path}`),
}));
// Achicar usa canvas, que jsdom no tiene: lo que importa acá es que se sube.
vi.mock("../shared/resizePhoto", () => ({
  resizePhotoForUpload: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })),
}));

const api = await import("../api/stationPhotos");

function foto(over: Partial<StationPhoto> = {}): StationPhoto {
  return {
    id: "u-1",
    tipo: "usuario",
    url: "/api/stations/photos/1/archivo",
    autor: "Lautaro",
    fecha: "2026-10-10T12:00:00Z",
    propia: false,
    foto_id: 1,
    credito: null,
    ...over,
  };
}

function galeria(fotos: StationPhoto[], puede_subir = 5): StationGallery {
  return { fotos, puede_subir };
}

function renderGaleria() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <StationPhotos nodeId="station_x" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("StationPhotos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin fotos invita a subir la primera", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(galeria([]));
    renderGaleria();
    expect(await screen.findByText(/Todavía no hay fotos/)).toBeTruthy();
  });

  it("muestra una miniatura por foto", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(
      galeria([foto(), foto({ id: "u-2", foto_id: 2, url: "/b" })])
    );
    renderGaleria();
    expect(await screen.findByLabelText("Ver foto 1 de 2")).toBeTruthy();
    expect(screen.getByLabelText("Ver foto 2 de 2")).toBeTruthy();
  });

  it("subir una foto la manda a la API y vuelve a pedir la galería", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(galeria([]));
    vi.mocked(api.uploadStationPhoto).mockResolvedValue(foto({ propia: true }));
    const { container } = renderGaleria();
    await screen.findByText(/Todavía no hay fotos/);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "f.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() =>
      expect(api.uploadStationPhoto).toHaveBeenCalledWith("station_x", expect.any(Blob))
    );
    await waitFor(() => expect(api.getStationPhotos).toHaveBeenCalledTimes(2));
  });

  it("con el cupo lleno no deja subir y lo explica", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(galeria([foto({ propia: true })], 0));
    const { container } = renderGaleria();
    expect(await screen.findByText(/Ya subiste el máximo/)).toBeTruthy();
    expect((container.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
  });

  it("la foto de Mapillary muestra su crédito y licencia", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(
      galeria([
        foto({
          id: "m-9",
          tipo: "mapillary",
          foto_id: null,
          autor: "alguien",
          credito: {
            texto: "© alguien, Mapillary",
            enlace: "https://www.mapillary.com/app/?pKey=9",
            licencia: "CC BY-SA 4.0",
            licencia_url: "https://creativecommons.org/licenses/by-sa/4.0/deed.es",
          },
        }),
      ])
    );
    renderGaleria();
    fireEvent.click(await screen.findByLabelText("Ver foto 1 de 1"));

    expect(screen.getByText("© alguien, Mapillary").getAttribute("href")).toBe(
      "https://www.mapillary.com/app/?pKey=9"
    );
    expect(screen.getByText("CC BY-SA 4.0")).toBeTruthy();
    expect(screen.queryByText("Reportar")).toBeNull(); // solo se reportan las subidas
  });

  it("la propia se puede borrar", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(
      galeria([foto({ propia: true, foto_id: 7 })])
    );
    vi.mocked(api.deleteStationPhoto).mockResolvedValue();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderGaleria();
    fireEvent.click(await screen.findByLabelText("Ver foto 1 de 1"));
    fireEvent.click(screen.getByText("Borrar foto"));
    await waitFor(() => expect(api.deleteStationPhoto).toHaveBeenCalledWith(7));
  });

  it("una ajena se puede reportar con un motivo", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(galeria([foto({ foto_id: 3 })]));
    vi.mocked(api.reportStationPhoto).mockResolvedValue({ oculta: false });
    renderGaleria();
    fireEvent.click(await screen.findByLabelText("Ver foto 1 de 1"));
    expect(screen.queryByText("Borrar foto")).toBeNull();

    fireEvent.click(screen.getByText("Reportar"));
    fireEvent.click(screen.getByLabelText("No es este cargador"));
    fireEvent.click(screen.getByText("Enviar reporte"));

    await waitFor(() => expect(api.reportStationPhoto).toHaveBeenCalledWith(3, "no_es_el_lugar"));
    expect(await screen.findByText("Gracias. La vamos a revisar.")).toBeTruthy();
  });

  it("Escape cierra el visor", async () => {
    vi.mocked(api.getStationPhotos).mockResolvedValue(galeria([foto()]));
    renderGaleria();
    fireEvent.click(await screen.findByLabelText("Ver foto 1 de 1"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
