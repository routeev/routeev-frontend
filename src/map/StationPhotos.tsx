import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteStationPhoto,
  getStationPhotos,
  reportStationPhoto,
  stationPhotoBlobUrl,
  uploadStationPhoto,
  type StationPhoto,
  type StationPhotoReportReason,
} from "../api/stationPhotos";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDate } from "../shared/format";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { IconBack, IconCamera, IconClose } from "./panelIcons";
import { stationPhotosQueryKey } from "./stationPhotosQuery";
import ui from "./panel.module.css";
import styles from "./StationPhotos.module.css";

/** Lado mayor con el que se sube: el servidor igual la deja en 1600 px. */
const UPLOAD_MAX_DIM = 1600;
const REASONS: StationPhotoReportReason[] = [
  "inapropiada",
  "no_es_el_lugar",
  "datos_personales",
  "otro",
];

/**
 * La imagen de una foto como blob URL (se sirve con login). Cacheada por
 * ruta: una foto nunca cambia de contenido (si se borra, la próxima tiene
 * otra ruta), así que no se vuelve a bajar al entrar y salir de la ficha.
 */
function usePhotoUrl(path: string) {
  const { data } = useQuery({
    queryKey: ["stationPhotoFile", path],
    queryFn: () => stationPhotoBlobUrl(path),
    staleTime: Infinity,
  });
  return data ?? null;
}

interface StationPhotosProps {
  nodeId: string;
}

/**
 * Galería de la estación, arriba en su ficha: la foto de la calle de
 * Mapillary (con su crédito, obligatorio por la licencia), las que sube la
 * comunidad y las de las reseñas. Tocar una la abre en grande; desde ahí se
 * borra una propia o se reporta una ajena.
 */
export function StationPhotos({ nodeId }: StationPhotosProps) {
  const { t } = useTranslation();
  const sp = t.map.stationPhotos;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: stationPhotosQueryKey(nodeId),
    queryFn: () => getStationPhotos(nodeId),
  });
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) =>
      uploadStationPhoto(nodeId, await resizePhotoForUpload(file, UPLOAD_MAX_DIM)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stationPhotosQueryKey(nodeId) }),
    onError: (err) => setError(err instanceof Error ? err.message : sp.uploadError),
  });

  if (query.isError) {
    return (
      <p role="alert" className={ui.alertDanger}>
        <span className={ui.alertText}>{sp.loadError}</span>
      </p>
    );
  }

  const fotos = query.data?.fotos ?? [];
  const puedeSubir = query.data?.puede_subir ?? 0;

  const addInput = (
    <input
      type="file"
      accept="image/*"
      hidden
      disabled={puedeSubir === 0 || upload.isPending}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        setError(null);
        if (file) upload.mutate(file);
      }}
    />
  );
  const addContent = (
    <>
      {upload.isPending ? (
        <span className={ui.spinner} aria-hidden="true" />
      ) : (
        <IconCamera size={18} />
      )}
      <span className={styles.addLabel}>{upload.isPending ? sp.adding : sp.add}</span>
    </>
  );

  return (
    <section className={styles.wrap} aria-label={sp.title}>
      {fotos.length > 0 ? (
        <>
          <div className={styles.head}>
            <h3 className={ui.sectionTitle}>{sp.title}</h3>
            {/* Arriba y no al final de la tira: con varias fotos, el final
                queda fuera de la vista y nadie lo encuentra. */}
            <label
              className={[ui.btnOutline, styles.addBtn].join(" ")}
              aria-disabled={puedeSubir === 0 || upload.isPending}
            >
              {addContent}
              {addInput}
            </label>
          </div>
          <div className={styles.strip}>
            {fotos.map((foto, i) => (
              <Thumb
                key={foto.id}
                foto={foto}
                label={sp.open(i + 1, fotos.length)}
                onOpen={() => setOpen(i)}
              />
            ))}
          </div>
        </>
      ) : (
        query.data && (
          <label className={styles.addTile} aria-disabled={puedeSubir === 0 || upload.isPending}>
            {addContent}
            <span className={styles.addHint}>{sp.emptyHint}</span>
            {addInput}
          </label>
        )
      )}

      {query.data && puedeSubir === 0 && <p className={ui.muted}>{sp.limitReached}</p>}
      {error && (
        <p role="alert" className={ui.alertDanger}>
          <span className={ui.alertText}>{error}</span>
        </p>
      )}

      {open != null && fotos[open] && (
        <Viewer
          fotos={fotos}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setOpen(null);
            queryClient.invalidateQueries({ queryKey: stationPhotosQueryKey(nodeId) });
          }}
        />
      )}
    </section>
  );
}

function Thumb({ foto, label, onOpen }: { foto: StationPhoto; label: string; onOpen: () => void }) {
  const url = usePhotoUrl(foto.url);
  return (
    <button type="button" className={styles.thumb} onClick={onOpen} aria-label={label}>
      {url ? (
        <img src={url} alt="" className={styles.thumbImg} />
      ) : (
        <span className={styles.thumbLoading} />
      )}
    </button>
  );
}

interface ViewerProps {
  fotos: StationPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Se borró o se reportó la foto: hay que volver a pedir la galería. */
  onChanged: () => void;
}

function Viewer({ fotos, index, onIndex, onClose, onChanged }: ViewerProps) {
  const { t } = useTranslation();
  const sp = t.map.stationPhotos;
  const foto = fotos[index];
  const url = usePhotoUrl(foto.url);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < fotos.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, fotos.length, onIndex, onClose]);

  return createPortal(
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={sp.title}
      onClick={onClose}
    >
      <div className={styles.viewerInner} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.viewerClose}
          onClick={onClose}
          aria-label={sp.close}
        >
          <IconClose />
        </button>
        <div className={styles.viewerStage}>
          {index > 0 && (
            <button
              type="button"
              className={[styles.nav, styles.navPrev].join(" ")}
              onClick={() => onIndex(index - 1)}
              aria-label={sp.previous}
            >
              <IconBack />
            </button>
          )}
          {url ? (
            <img src={url} alt="" className={styles.viewerImg} />
          ) : (
            <span className={ui.spinner} aria-hidden="true" />
          )}
          {index < fotos.length - 1 && (
            <button
              type="button"
              className={[styles.nav, styles.navNext].join(" ")}
              onClick={() => onIndex(index + 1)}
              aria-label={sp.next}
            >
              <IconBack />
            </button>
          )}
        </div>
        {/* key: al pasar a otra foto, el reporte a medio hacer de la anterior se descarta. */}
        <Caption key={foto.id} foto={foto} onChanged={onChanged} />
      </div>
    </div>,
    document.body
  );
}

function Caption({ foto, onChanged }: { foto: StationPhoto; onChanged: () => void }) {
  const { t } = useTranslation();
  const sp = t.map.stationPhotos;
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<StationPhotoReportReason>("inapropiada");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: () => deleteStationPhoto(foto.foto_id as number),
    onSuccess: onChanged,
    onError: (err) => setError(err instanceof Error ? err.message : sp.deleteError),
  });
  const report = useMutation({
    mutationFn: () => reportStationPhoto(foto.foto_id as number, reason),
    onSuccess: (res) => {
      setReporting(false);
      if (res.oculta) onChanged();
      else setNotice(sp.reported);
    },
    onError: (err) => setError(err instanceof Error ? err.message : sp.reportError),
  });

  const origen =
    foto.tipo === "mapillary" ? sp.streetView : foto.tipo === "resena" ? sp.fromReview : null;
  const autor = foto.credito ? null : foto.autor ? sp.by(foto.autor) : null;

  return (
    <div className={styles.caption}>
      <p className={styles.captionMain}>
        {[origen, autor, foto.fecha ? formatDate(foto.fecha) : null].filter(Boolean).join(" · ")}
      </p>
      {foto.credito && (
        <p className={styles.credit}>
          <a href={foto.credito.enlace} target="_blank" rel="noopener noreferrer">
            {foto.credito.texto}
          </a>
          {" · "}
          <a href={foto.credito.licencia_url} target="_blank" rel="noopener noreferrer">
            {foto.credito.licencia}
          </a>
        </p>
      )}

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && (
        <p role="alert" className={ui.alertDanger}>
          <span className={ui.alertText}>{error}</span>
        </p>
      )}

      {foto.tipo === "usuario" && foto.propia && (
        <button
          type="button"
          className={ui.btnOutline}
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(sp.confirmDelete)) remove.mutate();
          }}
        >
          {sp.delete}
        </button>
      )}

      {foto.tipo === "usuario" && !foto.propia && !reporting && !notice && (
        <button type="button" className={styles.reportLink} onClick={() => setReporting(true)}>
          {sp.report}
        </button>
      )}
      {reporting && (
        <form
          className={styles.reportForm}
          onSubmit={(e) => {
            e.preventDefault();
            report.mutate();
          }}
        >
          <fieldset className={styles.reasons}>
            <legend className={styles.reportTitle}>{sp.reportTitle}</legend>
            {REASONS.map((r) => (
              <label key={r} className={styles.reason}>
                <input
                  type="radio"
                  name="motivo"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {sp.reportReasons[r]}
              </label>
            ))}
          </fieldset>
          <div className={styles.reportActions}>
            <button type="button" className={ui.btnOutline} onClick={() => setReporting(false)}>
              {sp.cancel}
            </button>
            <button
              type="submit"
              className={[ui.btnOutline, ui.btnStrong].join(" ")}
              disabled={report.isPending}
            >
              {sp.sendReport}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
