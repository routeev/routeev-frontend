import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { deleteMyPhoto, getMe, uploadMyPhoto } from "../api/user";
import { Banner } from "../shared/Banner";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import styles from "./ProfilePage.module.css";

/**
 * "Mi cuenta": nombre, correo y foto de perfil. A diferencia de la foto de
 * un vehículo (blob privado con Authorization), la de perfil vive en
 * Cloudinary y es pública: va directo en el <img src>, sin fetch manual.
 */
export function AccountPanel() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => uploadMyPhoto(await resizePhotoForUpload(file)),
    onSuccess: (user) => queryClient.setQueryData(["me"], user),
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo subir la foto."),
  });

  const remove = useMutation({
    mutationFn: deleteMyPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo quitar la foto."),
  });

  const user = meQuery.data;

  return (
    <section className="panel">
      <div className={styles.panelHeader}>
        <h2>Mi cuenta</h2>
      </div>
      <div className={styles.accountRow}>
        <div className={styles.avatarWrap}>
          {user?.photo_url ? (
            <img src={user.photo_url} className={styles.avatar} alt="" />
          ) : (
            <div className={styles.avatarFallback}>{(user?.username ?? "?").charAt(0).toUpperCase()}</div>
          )}
          <label className={styles.photoEdit} title="Cambiar foto de perfil">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ""; // permite elegir el mismo archivo dos veces seguidas
                if (!file) return;
                setError(null);
                upload.mutate(file);
              }}
            />
            <span aria-hidden="true">✎</span>
            <span className="sr-only">Cambiar foto de perfil</span>
          </label>
        </div>
        <div className={styles.accountInfo}>
          <div className={styles.accountUsername}>{user?.username ?? "-"}</div>
          <div className="hint">{user?.email ?? ""}</div>
          {user?.photo_url && (
            <button
              type="button"
              className="ghost small"
              disabled={remove.isPending}
              onClick={() => {
                setError(null);
                remove.mutate();
              }}
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>
      {error && <Banner variant="error">{error}</Banner>}
    </section>
  );
}
