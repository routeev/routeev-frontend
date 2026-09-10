import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStationStatusReports,
  reportStationStatus,
  type EstadoReportado,
} from "../api/stationStatusReports";
import { useTranslation } from "../i18n/LanguageProvider";
import { Banner } from "../shared/Banner";
import { timeAgo } from "../shared/timeAgo";
import styles from "./StationStatusReport.module.css";

const ESTADOS: EstadoReportado[] = ["funciona", "ocupado", "no_funciona"];

/**
 * Reporte de estado A MANO de quien está viendo la estación ahora mismo --
 * distinto de StationStatusChip (el feed oficial de UTE, que hoy siempre
 * está "sin datos": ver useStationStatus.ts). Un tap agrega una fila nueva
 * en la API (nunca reemplaza el reporte anterior, ni siquiera el propio: dos
 * observaciones seguidas son dos hechos distintos, no una corrección) y se
 * apaga solo pasadas unas horas -- el backend deja de devolverlo, esta
 * pantalla no filtra nada por su cuenta.
 */
export function StationStatusReport({ nodeId }: { nodeId: string }) {
  const { t } = useTranslation();
  const sr = t.map.stationStatusReport;
  const queryClient = useQueryClient();

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
  const claseBoton: Record<EstadoReportado, string> = {
    funciona: styles.funciona,
    ocupado: styles.ocupado,
    no_funciona: styles.noFunciona,
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.titulo}>{sr.titulo}</p>
      <p className={styles.subtitulo}>{sr.subtitulo}</p>

      <div className={styles.botones} role="group" aria-label={sr.titulo}>
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            type="button"
            className={`${styles.boton} ${claseBoton[estado]}`}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(estado)}
          >
            {mutation.isPending && mutation.variables === estado ? sr.enviando : etiqueta[estado]}
          </button>
        ))}
      </div>

      {mutation.isError && <Banner variant="error">{sr.sendError}</Banner>}

      {query.data && query.data.reportes.length > 0 && (
        <ul className={styles.lista}>
          {query.data.reportes.map((r) => (
            <li key={r.id} className={`${styles.item} ${claseBoton[r.estado]}`}>
              {sr.reporte(etiqueta[r.estado], timeAgo(r.created_at, sr))}
            </li>
          ))}
        </ul>
      )}
      {query.data && query.data.reportes.length === 0 && <p className={styles.sinReportes}>{sr.sinReportes}</p>}
    </div>
  );
}
