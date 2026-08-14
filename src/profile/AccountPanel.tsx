import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { deleteMyPhoto, getMe, updateMyUsername, uploadMyPhoto } from "../api/user";
import { setUsername as setStoredUsername } from "../api/session";
import { Banner } from "../shared/Banner";
import { cloudinaryResize } from "../shared/cloudinaryResize";
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
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

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

  const rename = useMutation({
    mutationFn: (username: string) => updateMyUsername(username),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      // No solo el cache de la query: /app muestra el chip de usuario con
      // getUsername() (localStorage) como respaldo cuando no le pasan un
      // username por prop (ver AppTopbar.tsx) -- sin esto, ahí seguía
      // mostrando el nombre viejo hasta el próximo login.
      setStoredUsername(user.username);
      setEditingUsername(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo cambiar el nombre de usuario."),
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
            <img src={cloudinaryResize(user.photo_url, 150)} className={styles.avatar} alt="" />
          ) : (
            <div className={styles.avatarFallback}>
              {(user?.username ?? "?").charAt(0).toUpperCase()}
            </div>
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
          {editingUsername ? (
            <form
              className={styles.usernameEditRow}
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                const trimmed = usernameInput.trim();
                if (!trimmed || trimmed === user?.username) {
                  setEditingUsername(false);
                  return;
                }
                rename.mutate(trimmed);
              }}
            >
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                minLength={3}
                maxLength={32}
                autoFocus
                disabled={rename.isPending}
              />
              <button type="submit" className="primary small" disabled={rename.isPending}>
                {rename.isPending ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="ghost small"
                disabled={rename.isPending}
                onClick={() => {
                  setError(null);
                  setEditingUsername(false);
                }}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className={styles.usernameRow}>
              <span className={styles.accountUsername}>{user?.username ?? "-"}</span>
              <button
                type="button"
                className={styles.usernameEditBtn}
                title="Cambiar nombre de usuario"
                onClick={() => {
                  setError(null);
                  setUsernameInput(user?.username ?? "");
                  setEditingUsername(true);
                }}
              >
                <span aria-hidden="true">✎</span>
                <span className="sr-only">Cambiar nombre de usuario</span>
              </button>
            </div>
          )}
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
