import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StationReview, StationReviewsPayload } from "../api/stationReviews";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { StationReviews } from "./StationReviews";

// El módulo entero se mockea: así el test no toca red, ni token, ni
// localStorage (que en este entorno jsdom no existe).
vi.mock("../api/stationReviews", () => ({
  getStationReviews: vi.fn(),
  upsertMyStationReview: vi.fn(),
  deleteMyStationReview: vi.fn(),
  uploadMyStationReviewPhoto: vi.fn(),
  deleteMyStationReviewPhoto: vi.fn(),
  stationReviewPhotoUrl: vi.fn(),
}));

const api = await import("../api/stationReviews");

function mkReview(over: Partial<StationReview> = {}): StationReview {
  return {
    id: 7,
    user_id: 1,
    username: "Matias",
    rating: 5,
    comment: "Muy bueno, efectivo.",
    has_photo: false,
    created_at: "2026-08-13T19:00:00Z",
    updated_at: "2026-08-13T19:00:00Z",
    is_own: true,
    ...over,
  };
}

function mockPayload(reviews: StationReview[]) {
  const payload: StationReviewsPayload = {
    summary: { avg_rating: reviews.length ? 5 : null, count: reviews.length },
    reviews,
  };
  vi.mocked(api.getStationReviews).mockResolvedValue(payload);
}

function renderReviews() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <StationReviews nodeId="n123" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("StationReviews: la reseña propia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.stationReviewPhotoUrl).mockResolvedValue(null);
  });

  it("con reseña propia muestra lo escrito, no el formulario", async () => {
    mockPayload([mkReview()]);
    renderReviews();

    expect(await screen.findByText("Muy bueno, efectivo.")).toBeInTheDocument();
    // Acotado al encabezado de la tarjeta: el promedio de la estación pinta
    // sus propias estrellas con la misma etiqueta, y lo que se verifica acá
    // es que la reseña propia muestre LAS SUYAS al lado de "Tu reseña".
    const encabezado = screen.getByText("Tu reseña").parentElement!;
    expect(within(encabezado).getByLabelText("5.0 de 5 estrellas")).toBeInTheDocument();
    // Lo que el usuario pidió: nada de textarea ni botones de edición hasta
    // que los pida.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("muestra la foto de la reseña propia cuando hay", async () => {
    mockPayload([mkReview({ has_photo: true })]);
    vi.mocked(api.stationReviewPhotoUrl).mockResolvedValue("blob:foto-de-la-resena");
    renderReviews();

    const foto = await screen.findByRole("presentation");
    expect(foto).toHaveAttribute("src", "blob:foto-de-la-resena");
  });

  it("«Editar» abre el formulario precargado y «Cancelar» vuelve a la vista", async () => {
    mockPayload([mkReview()]);
    renderReviews();

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const textarea = await screen.findByRole("textbox");
    expect(textarea).toHaveValue("Muy bueno, efectivo.");
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
    expect(screen.getByText("Muy bueno, efectivo.")).toBeInTheDocument();
  });

  it("sin reseña propia el formulario es la vista, y no ofrece cancelar", async () => {
    mockPayload([]);
    renderReviews();

    expect(await screen.findByText("Dejá tu reseña")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("las reseñas ajenas siguen listándose aparte de la propia", async () => {
    mockPayload([
      mkReview(),
      mkReview({ id: 8, username: "Gonzalo", comment: "Estaba ocupado.", rating: 3, is_own: false }),
    ]);
    renderReviews();

    expect(await screen.findByText("Gonzalo")).toBeInTheDocument();
    expect(screen.getByText("Estaba ocupado.")).toBeInTheDocument();
    // La propia sigue en modo lectura, sin formulario.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
