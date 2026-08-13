import { apiFetch } from "./client";
import { API_BASE_URL } from "./config";
import { getToken } from "./session";

export interface StationReview {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  comment: string | null;
  has_photo: boolean;
  created_at: string;
  updated_at: string;
  is_own: boolean;
}

export interface StationReviewSummary {
  avg_rating: number | null;
  count: number;
}

export interface StationReviewsPayload {
  summary: StationReviewSummary;
  reviews: StationReview[];
}

/** Promedio + cantidad de TODAS las estaciones con reseña, en un solo pedido (para el badge en la lista completa). */
export function listStationReviewSummaries(): Promise<Record<string, StationReviewSummary>> {
  return apiFetch("/api/stations/reviews-summary");
}

export function getStationReviews(nodeId: string): Promise<StationReviewsPayload> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/reviews`);
}

export function upsertMyStationReview(
  nodeId: string,
  rating: number,
  comment: string | null
): Promise<StationReview> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/reviews/me`, {
    method: "PUT",
    body: { rating, comment },
  });
}

export function deleteMyStationReview(nodeId: string): Promise<void> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/reviews/me`, { method: "DELETE" });
}

export function uploadMyStationReviewPhoto(nodeId: string, blob: Blob): Promise<StationReview> {
  const form = new FormData();
  form.append("file", blob, "resena.jpg");
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/reviews/me/photo`, {
    method: "POST",
    body: form,
  });
}

export function deleteMyStationReviewPhoto(nodeId: string): Promise<StationReview> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/reviews/me/photo`, { method: "DELETE" });
}

/**
 * La foto de una reseña es privada (igual que la de un vehículo): no pasa
 * por apiFetch porque la respuesta son bytes, no JSON, y un <img src> no
 * puede mandar el header Authorization -- hay que pedirla a mano y
 * convertirla a blob URL (ver vehicles.ts#vehiclePhotoUrl).
 */
export async function stationReviewPhotoUrl(reviewId: number): Promise<string | null> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/stations/reviews/${reviewId}/photo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}
