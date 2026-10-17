import { apiFetch } from "./client";
import { API_BASE_URL } from "./config";
import { getToken } from "./session";

/** Crédito obligatorio de una foto con licencia libre (hoy, las de Mapillary: CC BY-SA 4.0). */
export interface StationPhotoCredit {
  texto: string;
  enlace: string;
  licencia: string;
  licencia_url: string;
}

export interface StationPhoto {
  /** "u-12" (subida), "r-5" (de una reseña) o "m-…" (Mapillary). */
  id: string;
  tipo: "usuario" | "resena" | "mapillary";
  /** Ruta de la API; se pide con login (ver stationPhotoBlobUrl). */
  url: string;
  autor: string | null;
  fecha: string | null;
  propia: boolean;
  /** Solo en las subidas: con este id se borran o se reportan. */
  foto_id: number | null;
  credito: StationPhotoCredit | null;
}

export interface StationGallery {
  fotos: StationPhoto[];
  /** Cuántas más puede subir este usuario a esta estación. */
  puede_subir: number;
}

export type StationPhotoReportReason =
  "inapropiada" | "no_es_el_lugar" | "datos_personales" | "otro";

export function getStationPhotos(nodeId: string): Promise<StationGallery> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/photos`);
}

export function uploadStationPhoto(nodeId: string, blob: Blob): Promise<StationPhoto> {
  const form = new FormData();
  form.append("file", blob, "foto.jpg");
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/photos`, {
    method: "POST",
    body: form,
  });
}

export function deleteStationPhoto(photoId: number): Promise<void> {
  return apiFetch(`/api/stations/photos/${photoId}`, { method: "DELETE" });
}

export function reportStationPhoto(
  photoId: number,
  motivo: StationPhotoReportReason
): Promise<{ oculta: boolean }> {
  return apiFetch(`/api/stations/photos/${photoId}/reportes`, { method: "POST", body: { motivo } });
}

/**
 * Las fotos se sirven con login: un <img src> no puede mandar el header
 * Authorization, así que se piden a mano y se convierten a blob URL (mismo
 * criterio que stationReviewPhotoUrl).
 */
export async function stationPhotoBlobUrl(path: string): Promise<string | null> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}
