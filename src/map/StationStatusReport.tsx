import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getStationStatusReports,
  reportStationStatus,
  type EstadoReportado,
} from "../api/stationStatusReports";
import { useTranslation } from "../i18n/LanguageProvider";
import { timeAgo } from "../shared/timeAgo";
import { IconCheck } from "./panelIcons";
import ui from "./panel.module.css";
import styles from "./StationStatusReport.module.css";

const ESTADOS: EstadoReportado[] = ["funciona", "ocupado", "no_funciona"];

/**
 * Reporte de estado A MANO de quien está viendo la estación ahora mismo --
 * distinto de StationStatusChip (el feed oficial de UTE, que hoy siempre
 * está "sin datos": ver useStationStatus.ts). Se elige el estado y se
 * confirma con "Enviar reporte": un toque suelto en el segmentado no manda
 * nada, para que mirar las opciones no publique un reporte por accidente.
 *
 * Cada envío agrega una fila nueva en la API (nunca reemplaza el reporte
 * anterior, ni siquiera el propio: dos observaciones seguidas son dos hechos
 * distintos, no una corrección) y se apaga solo pasadas unas horas -- el
 * backend deja de devolverlo, esta pantalla no filtra nada por su cuenta.
 */
export function StationStatusReport({ nodeId }: { nodeId: string }) {
  const { t } = useTranslation();
  const sr = t.map.stationStatusReport;
  const sp = t.map.panel.stations;
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<EstadoReportado | null>(null);

  const query = useQuery({
    queryKey: ["stationStatusReports", nodeId],
    queryFn: () => getStationStatusReports(nodeId),
  });

  const mutation = useMutation({
    mutationFn: (estado: EstadoReportado) => reportStationStatus(nodeId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stationStatusReports", nodeId] });
    },
  });

  const etiqueta: Record<EstadoReportado, string> = {
    funciona: sr.funciona,
    ocupado: sr.ocupado,
    no_funciona: sr.noFunciona,
  };
  const tono: Record<EstadoReportado, string> = {
    funciona: styles.funciona,
    ocupado: styles.ocupado,
    no_funciona: styles.noFunciona,
  };

  const reportes = query.data?.reportes ?? [];
  // Enviado = el último envío salió bien y no se eligió otra cosa después.
  const sent = mutation.isSuccess && mutation.variables === picked;

  return (
    <section className={styles.wrap} aria-labelledby={`report-${nodeId}`}>
      <div className={styles.head}>
        <h3 className={ui.sectionTitle} id={`report-${nodeId}`}>
          {sp.reportTitle}
        </h3>
        <p className={ui.muted}>{reportes.length > 0 ? sp.reportQuestion : sp.reportFirst}</p>
      </div>

      <div role="radiogroup" aria-labelledby={`report-${nodeId}`} className={ui.segmented}>
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            type="button"
            role="radio"
            aria-checked={picked === estado}
            className={ui.segOption}
            disabled={mutation.isPending}
            onClick={() => {
              setPicked(estado);
              mutation.reset();
            }}
          >
            {etiqueta[estado]}
          </button>
        ))}
      </div>

      {picked && !sent && (
        <button
          type="button"
          className={[ui.btnOutline, ui.btnStrong, styles.send].join(" ")}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(picked)}
        >
          {mutation.isPending ? sr.enviando : sp.sendReport}
        </button>
      )}
      {sent && (
        <p role="status" className={ui.statusOk}>
          <IconCheck />
          {sp.reportThanks}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className={ui.alertDanger}>
          <span className={ui.alertText}>{sr.sendError}</span>
        </p>
      )}

      {reportes.length > 0 && (
        <ul className={styles.lista}>
          {reportes.map((r) => (
            <li key={r.id} className={`${styles.item} ${tono[r.estado]}`}>
              {sr.reporte(etiqueta[r.estado], timeAgo(r.created_at, sr))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
