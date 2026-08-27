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
import { Banner } from "../shared/Banner";
import buttons from "../shared/buttons.module.css";
import { formatDate } from "../shared/format";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { RatingSummary } from "./RatingSummary";
import { Stars, StarPicker } from "./Stars";
import { stationReviewPhotoQueryKey, useStationReviewPhoto } from "./useStationReviewPhoto";
import styles from "./StationReviews.module.css";

interface StationReviewsProps {
  nodeId: string;
}

export function StationReviews({ nodeId }: StationReviewsProps) {
  const { t } = useTranslation();
  const sr = t.map.stationReviews;
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
  }

  if (query.isLoading) return <p className="hint">{sr.loading}</p>;
  if (query.isError) return <Banner variant="error">{sr.loadError}</Banner>;
  if (!query.data) return null;

  const { summary, reviews } = query.data;
  const myReview = reviews.find((r) => r.is_own) ?? null;
  const otherReviews = reviews.filter((r) => !r.is_own);

  return (
    <div className={styles.wrap}>
      <div className={styles.summaryLine}>
        {summary.count > 0 ? (
          <RatingSummary summary={summary} size={14} />
        ) : (
          <span className="hint" style={{ margin: 0 }}>
            {sr.noReviewsYet}
          </span>
        )}
      </div>

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

      {otherReviews.length > 0 && (
        <ul className={styles.list}>
          {otherReviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
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
        <button type="button" className="ghost small" onClick={onEdit}>
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
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {existing?.has_photo && photoUrl && (
        <div className={styles.photoPreviewRow}>
          <img src={photoUrl} alt="" className={styles.photoPreview} />
          <button type="button" className="ghost small" disabled={busy} onClick={() => removePhoto.mutate()}>
            {sr.removePhoto}
          </button>
        </div>
      )}

      {error && <Banner variant="error">{error}</Banner>}

      <div className={styles.formActions}>
        {existing && (
          <label className={buttons.ghost}>
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
        {onCancel && (
          <button type="button" className="ghost small" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="primary small" disabled={busy}>
          {upsert.isPending ? sr.saving : existing ? sr.update : sr.publish}
        </button>
        {existing && (
          <button type="button" className="ghost small" disabled={busy} onClick={() => removeReview.mutate()}>
            {sr.delete}
          </button>
        )}
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
        <Stars value={review.rating} size={12} />
      </div>
      {review.comment && <p className={styles.itemComment}>{review.comment}</p>}
      {photoUrl && <img src={photoUrl} alt="" className={styles.itemPhoto} />}
      <span className={styles.itemDate}>{formatDate(review.updated_at)}</span>
    </li>
  );
}
