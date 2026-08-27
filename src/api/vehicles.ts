import type { PhotoCredit } from "./showroom";
import { apiFetch } from "./client";
import { getToken } from "./session";
import { API_BASE_URL } from "./config";

export interface Vehicle {
  id: number;
  name: string;
  battery_capacity_kwh: number;
  consumption_kwh_per_km: number;
  charging_power_kw: number;
  has_photo?: boolean;
}

export interface EvModel {
  marca: string;
  modelo: string;
  bateria_kwh: number;
  consumo_kwh_km: number;
  potencia_carga_kw: number;
  autonomia_aprox_km: number;
  foto_url?: string;
  foto_credito?: PhotoCredit;
}

export interface NewVehiclePayload {
  name: string;
  battery_capacity_kwh: number;
  consumption_kwh_per_km: number;
  charging_power_kw: number;
}

export function listVehicles(): Promise<Vehicle[]> {
  return apiFetch<Vehicle[]>("/api/vehicles");
}

export function listEvModels(): Promise<EvModel[]> {
  return apiFetch<EvModel[]>("/api/vehicles/models");
}

export function lookupVehicleAiPhoto(blob: Blob): Promise<EvModel> {
  const form = new FormData();
  form.append("file", blob, "vehiculo.jpg");
  return apiFetch<EvModel>("/api/vehicles/lookup-ai-photo", { method: "POST", body: form });
}

export function createVehicle(payload: NewVehiclePayload): Promise<Vehicle> {
  return apiFetch<Vehicle>("/api/vehicles", { method: "POST", body: payload });
}

export function deleteVehicle(id: number): Promise<void> {
  return apiFetch<void>(`/api/vehicles/${id}`, { method: "DELETE" });
}

export function uploadVehiclePhoto(id: number, blob: Blob): Promise<void> {
  const form = new FormData();
  form.append("file", blob, "vehiculo.jpg");
  return apiFetch<void>(`/api/vehicles/${id}/photo`, { method: "POST", body: form });
}

export function deleteVehiclePhoto(id: number): Promise<void> {
  return apiFetch<void>(`/api/vehicles/${id}/photo`, { method: "DELETE" });
}

/**
 * La foto de un vehículo es privada (a diferencia de la del showroom): no
 * pasa por apiFetch porque la respuesta son bytes, no JSON, y un <img src>
 * no puede mandar el header Authorization -- hay que pedirla a mano y
 * convertirla a blob URL (ver js/api.js#vehiclePhotoUrl).
 */
export async function vehiclePhotoUrl(id: number): Promise<string | null> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/vehicles/${id}/photo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}
