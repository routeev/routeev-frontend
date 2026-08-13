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
import { Banner } from "../shared/Banner";
import buttons from "../shared/buttons.module.css";
import { formatDate } from "../shared/format";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { RatingSummary } from "./RatingSummary";
import { Stars, StarPicker } from "./Stars";
import { useStationReviewPhoto } from "./useStationReviewPhoto";
import styles from "./StationReviews.module.css";

interface StationReviewsProps {
  nodeId: string;
}

export function StationReviews({ nodeId }: StationReviewsProps) {
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

  if (query.isLoading) return <p className="hint">Cargando reseñas...</p>;
  if (query.isError) return <Banner variant="error">No se pudieron cargar las reseñas de esta estación.</Banner>;
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
            Todavía no hay reseñas. Sé el primero en dejar una.
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
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const photoUrl = useStationReviewPhoto(existing?.id ?? 0, existing?.has_photo);

  const upsert = useMutation({
    mutationFn: () => upsertMyStationReview(nodeId, rating, comment.trim() || null),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo guardar la reseña."),
  });

  const removeReview = useMutation({
    mutationFn: () => deleteMyStationReview(nodeId),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo borrar la reseña."),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => uploadMyStationReviewPhoto(nodeId, await resizePhotoForUpload(file)),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo subir la foto."),
  });

  const removePhoto = useMutation({
    mutationFn: () => deleteMyStationReviewPhoto(nodeId),
    onSuccess: onSaved,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo quitar la foto."),
  });

  const busy = upsert.isPending || removeReview.isPending || uploadPhoto.isPending || removePhoto.isPending;

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (rating < 1) {
          setError("Elegí una cantidad de estrellas.");
          return;
        }
        upsert.mutate();
      }}
    >
      <div className={styles.formHeader}>
        <span className={styles.formLabel}>{existing ? "Tu reseña" : "Dejá tu reseña"}</span>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <textarea
        className={styles.textarea}
        placeholder="¿Cómo fue tu experiencia en esta estación? (opcional)"
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {existing?.has_photo && photoUrl && (
        <div className={styles.photoPreviewRow}>
          <img src={photoUrl} alt="" className={styles.photoPreview} />
          <button type="button" className="ghost small" disabled={busy} onClick={() => removePhoto.mutate()}>
            Quitar foto
          </button>
        </div>
      )}

      {error && <Banner variant="error">{error}</Banner>}

      <div className={styles.formActions}>
        {existing && (
          <label className={buttons.ghost}>
            {existing.has_photo ? "Cambiar foto" : "Agregar foto"}
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
          {upsert.isPending ? "Guardando..." : existing ? "Actualizar" : "Publicar"}
        </button>
        {existing && (
          <button type="button" className="ghost small" disabled={busy} onClick={() => removeReview.mutate()}>
            Borrar
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
