import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  deleteMyStationReview,
  deleteMyStationReviewPhoto,
  getStationReviews,
  uploadMyStationReviewPhoto,
  upsertMyStationReview,
  type StationReview,
} from "../api/stationReviews";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDate } from "../shared/format";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { IconCamera } from "./panelIcons";
import { Stars, StarPicker } from "./Stars";
import { stationPhotosQueryKey } from "./stationPhotosQuery";
import { stationReviewPhotoQueryKey, useStationReviewPhoto } from "./useStationReviewPhoto";
import ui from "./panel.module.css";
import styles from "./StationReviews.module.css";

interface StationReviewsProps {
  nodeId: string;
}

export function StationReviews({ nodeId }: StationReviewsProps) {
  const { t } = useTranslation();
  const sr = t.map.stationReviews;
  const sp = t.map.panel.stations;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["stationReviews", nodeId], queryFn: () => getStationReviews(nodeId) });
  // Con reseña propia ya publicada, lo que se muestra es la reseña -- no el
  // formulario para volver a escribirla. Editarla es un paso explicito. Va
  // antes de los returns condicionales de abajo (reglas de hooks), y no hace
  // falta resetearlo al cambiar de estacion: el panel monta un
  // StationReviews por estacion y desmonta el anterior al abrir otra.
  const [editing, setEditing] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["stationReviews", nodeId] });
    // El promedio/cantidad de esta estacion (badge en la lista y en el popup
    // del mapa) sale de una consulta aparte -- sin esto quedaria
    // desactualizado hasta la proxima vez que se recargue toda la lista.
    queryClient.invalidateQueries({ queryKey: ["stationReviewSummaries"] });
    // Las fotos de las reseñas también se muestran en la galería de arriba.
    queryClient.invalidateQueries({ queryKey: stationPhotosQueryKey(nodeId) });
  }

  const head = (count: number | null) => (
    <div className={styles.head}>
      <h3 className={ui.sectionTitle}>{sp.reviews}</h3>
      {count != null && count > 0 && <span className={styles.count}>{sp.reviewCount(count)}</span>}
    </div>
  );

  if (query.isLoading) {
    return (
      <section className={styles.wrap}>
        {head(null)}
        <p className={ui.muted}>{sr.loading}</p>
      </section>
    );
  }
  if (query.isError || !query.data) {
    return (
      <section className={styles.wrap}>
        {head(null)}
        {query.isError && (
          <p role="alert" className={ui.alertDanger}>
            <span className={ui.alertText}>{sr.loadError}</span>
          </p>
        )}
      </section>
    );
  }

  const { summary, reviews } = query.data;
  const myReview = reviews.find((r) => r.is_own) ?? null;
  const otherReviews = reviews.filter((r) => !r.is_own);

  return (
    <section className={styles.wrap}>
      {head(summary.count)}

      {reviews.length === 0 && (
        <div className={styles.empty}>
          <p className={ui.cardTitle}>{sp.noReviewsTitle}</p>
          <p className={ui.muted}>{sp.noReviewsBody}</p>
        </div>
      )}

      {otherReviews.length > 0 && (
        <ul className={styles.list}>
          {otherReviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}

      {myReview && !editing ? (
        <MyReview review={myReview} onEdit={() => setEditing(true)} />
      ) : (
        <ReviewForm
          key={myReview?.id ?? "new"}
          nodeId={nodeId}
          existing={myReview}
          onSaved={() => {
            setEditing(false);
            invalidate();
          }}
          // Sin reseña previa no hay a que volver: el formulario es la vista.
          onCancel={myReview ? () => setEditing(false) : undefined}
        />
      )}
    </section>
  );
}

/**
 * La reseña propia ya publicada, en modo lectura: las estrellas, el
 * comentario y la foto tal como quedaron. El formulario (con su textarea y
 * sus botones de foto/borrar) aparece solo al tocar "Editar".
 */
function MyReview({ review, onEdit }: { review: StationReview; onEdit: () => void }) {
  const photoUrl = useStationReviewPhoto(review.id, review.has_photo);

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <span className={styles.formLabel}>Tu reseña</span>
        <Stars value={review.rating} size={16} />
      </div>
      {review.comment && <p className={styles.itemComment}>{review.comment}</p>}
      {photoUrl && <img src={photoUrl} alt="" className={styles.itemPhoto} />}
      <div className={styles.mineFooter}>
        <span className={styles.itemDate}>{formatDate(review.updated_at)}</span>
        <button type="button" className={ui.btnOutline} onClick={onEdit}>
          Editar
        </button>
      </div>
    </div>
  );
}

interface ReviewFormProps {
  nodeId: string;
  existing: StationReview | null;
  onSaved: () => void;
  /** Solo al editar una reseña que ya existe: vuelve al modo lectura. */
  onCancel?: () => void;
}

function ReviewForm({ nodeId, existing, onSaved, onCancel }: ReviewFormProps) {
  const { t } = useTranslation();
  const sr = t.map.stationReviews;
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const photoUrl = useStationReviewPhoto(existing?.id ?? 0, existing?.has_photo);

  // La foto vieja (si había) queda cacheada como blob URL en React Query
  // (ver useStationReviewPhoto.ts) -- sin revocarla acá quedaría viva en
  // memoria para siempre, y sin invalidar la query se seguiría mostrando esa
  // misma blob URL (ya desactualizada) en vez de pedir la nueva.
  const invalidatePhoto = () => {
    if (!existing) return;
    const key = stationReviewPhotoQueryKey(existing.id);
    const old = queryClient.getQueryData<string | null>(key);
    if (old) URL.revokeObjectURL(old);
    queryClient.invalidateQueries({ queryKey: key });
  };

  const upsert = useMutation({
    mutationFn: () => upsertMyStationReview(nodeId, rating, comment.trim() || null),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : sr.saveError),
  });

  const removeReview = useMutation({
    mutationFn: () => deleteMyStationReview(nodeId),
    onSuccess: () => {
      onSaved();
      invalidatePhoto();
    },
    onError: (err) => setError(err instanceof Error ? err.message : sr.deleteError),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => uploadMyStationReviewPhoto(nodeId, await resizePhotoForUpload(file)),
    onSuccess: () => {
      onSaved();
      invalidatePhoto();
    },
    onError: (err) => setError(err instanceof Error ? err.message : sr.uploadPhotoError),
  });

  const removePhoto = useMutation({
    mutationFn: () => deleteMyStationReviewPhoto(nodeId),
    onSuccess: () => {
      onSaved();
      invalidatePhoto();
    },
    onError: (err) => setError(err instanceof Error ? err.message : sr.removePhotoError),
  });

  const busy = upsert.isPending || removeReview.isPending || uploadPhoto.isPending || removePhoto.isPending;

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (rating < 1) {
          setError(sr.starsRequired);
          return;
        }
        upsert.mutate();
      }}
    >
      <div className={styles.formHeader}>
        <span className={styles.formLabel}>{existing ? sr.yourReview : sr.writeReview}</span>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <textarea
        className={styles.textarea}
        placeholder={sr.commentPlaceholder}
        maxLength={1000}
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {existing?.has_photo && photoUrl && (
        <div className={styles.photoPreviewRow}>
          <img src={photoUrl} alt="" className={styles.photoPreview} />
          <button type="button" className={ui.btnOutline} disabled={busy} onClick={() => removePhoto.mutate()}>
            {sr.removePhoto}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={ui.alertDanger}>
          <span className={ui.alertText}>{error}</span>
        </p>
      )}

      <div className={styles.formActions}>
        {/* La foto se sube sobre una reseña que ya existe (la API la cuelga
            de la reseña), por eso recién aparece después de publicar. */}
        {existing && (
          <label className={[ui.btnOutline, styles.photoBtn].join(" ")}>
            <IconCamera />
            {existing.has_photo ? sr.changePhoto : sr.addPhoto}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) uploadPhoto.mutate(file);
              }}
            />
          </label>
        )}
        <span className={styles.actionsEnd}>
          {existing && (
            <button type="button" className={ui.btnOutline} disabled={busy} onClick={() => removeReview.mutate()}>
              {sr.delete}
            </button>
          )}
          {onCancel && (
            <button type="button" className={ui.btnOutline} disabled={busy} onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className={[ui.btnOutline, ui.btnStrong].join(" ")} disabled={busy}>
            {upsert.isPending ? sr.saving : existing ? sr.update : sr.publish}
          </button>
        </span>
      </div>
    </form>
  );
}

function ReviewItem({ review }: { review: StationReview }) {
  const photoUrl = useStationReviewPhoto(review.id, review.has_photo);
  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.itemUser}>{review.username}</span>
        <span className={styles.itemDate}>{formatDate(review.updated_at)}</span>
      </div>
      <Stars value={review.rating} size={14} />
      {review.comment && <p className={styles.itemComment}>{review.comment}</p>}
      {photoUrl && <img src={photoUrl} alt="" className={styles.itemPhoto} />}
    </li>
  );
}
