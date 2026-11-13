import type { PhotoCredit } from "./showroom";
import { apiFetch } from "./client";
import { getToken } from "./session";
import { API_BASE_URL } from "./config";

/**
 * Conector de carga rápida del auto. Casi todos son CCS2; un GB/T sin adaptador
 * solo carga en las estaciones que tienen GB/T, que son pocas.
 */
export type ConectorAuto = "ccs2" | "gbt" | "gbt_con_adaptador";

export interface Vehicle {
  id: number;
  name: string;
  battery_capacity_kwh: number;
  consumption_kwh_per_km: number;
  charging_power_kw: number;
  /** Opcional: una API anterior a este campo no lo manda, y es lo mismo que "ccs2". */
  conector?: ConectorAuto;
  has_photo?: boolean;
  /**
   * Foto de catálogo del modelo, para mostrar mientras no haya una propia.
   * Solo viene cuando el nombre coincide exacto con un modelo del catálogo.
   * Opcional: una API anterior a este campo no lo manda.
   */
  foto_modelo_url?: string | null;
  foto_modelo_credito?: PhotoCredit | null;
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
  /** Sin él la API deja CCS2 al crear y conserva el que tenía al editar. */
  conector?: ConectorAuto;
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

/** Reemplaza los cuatro datos de un auto propio. La foto y los viajes ya hechos no cambian. */
export function updateVehicle(id: number, payload: NewVehiclePayload): Promise<Vehicle> {
  return apiFetch<Vehicle>(`/api/vehicles/${id}`, { method: "PUT", body: payload });
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
