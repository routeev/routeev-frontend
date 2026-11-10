import { apiFetch } from "./client";

export type EstadoReportado = "funciona" | "no_funciona" | "ocupado";

export interface StationStatusReport {
  id: number;
  estado: EstadoReportado;
  created_at: string;
}

export interface StationStatusReportsPayload {
  reportes: StationStatusReport[];
  vigente_horas: number;
}

export function getStationStatusReports(
  nodeId: string,
  signal?: AbortSignal
): Promise<StationStatusReportsPayload> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/estado-reportado`, { signal });
}

export function reportStationStatus(nodeId: string, estado: EstadoReportado): Promise<StationStatusReport> {
  return apiFetch(`/api/stations/${encodeURIComponent(nodeId)}/estado-reportado`, {
    method: "POST",
    body: { estado },
  });
}
