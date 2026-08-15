import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { deleteMyPhoto, getMe, updateMyUsername, uploadMyPhoto } from "../api/user";
import { setUsername as setStoredUsername } from "../api/session";
import { Banner } from "../shared/Banner";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { Spinner } from "../shared/Spinner";
import { toast } from "../shared/toastStore";
import styles from "./ProfilePage.module.css";

/**
 * QA MEDIO 19: el campo tenía minLength/maxLength y el navegador cortaba el
 * envío con su propio cartel en inglés ("Please lengthen this text to 3
 * characters or more"). Los límites son los del backend (ver
 * updateMyUsername): se validan acá, en castellano, con noValidate puesto.
 */
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;

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
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  // La foto de perfil cambia arriba de todo y la persona que la subió está
  // mirando el selector de archivos, no el avatar: sin un aviso, el resultado
  // de la subida pasaba desapercibido tanto cuando salía bien como cuando no.
  const upload = useMutation({
    mutationFn: async (file: File) => uploadMyPhoto(await resizePhotoForUpload(file)),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      toast.ok("Listo, cambiamos tu foto de perfil.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto."),
  });

  const remove = useMutation({
    mutationFn: deleteMyPhoto,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.ok("Listo, sacamos tu foto de perfil.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "No se pudo quitar la foto."),
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
      toast.ok(`Listo, ahora te llamás «${user.username}».`);
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
            {upload.isPending ? <Spinner size={12} /> : <span aria-hidden="true">✎</span>}
            <span className="sr-only">Cambiar foto de perfil</span>
          </label>
        </div>
        <div className={styles.accountInfo}>
          {editingUsername ? (
            <form
              className={styles.usernameEditForm}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                setUsernameError(null);
                const trimmed = usernameInput.trim();
                // Dejarlo igual (o vacío) no es un error: es "me arrepentí".
                if (!trimmed || trimmed === user?.username) {
                  setEditingUsername(false);
                  return;
                }
                if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
                  setUsernameError(
                    `El nombre de usuario tiene que tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`
                  );
                  return;
                }
                rename.mutate(trimmed);
              }}
            >
              {/* <label> de verdad, con htmlFor: el campo aparece EN LUGAR del
                  nombre, así que sin esto no hay nada en pantalla que diga qué
                  se está editando -- ni para quien ve, ni para un lector de
                  pantalla, que solo anunciaba "cuadro de edición". */}
              <label htmlFor="account-username">Tu nombre de usuario</label>
              <div className={styles.usernameEditRow}>
                <input
                  id="account-username"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setUsernameError(null);
                  }}
                  maxLength={USERNAME_MAX}
                  autoFocus
                  disabled={rename.isPending}
                  aria-invalid={Boolean(usernameError)}
                  aria-describedby={usernameError ? "account-username-error" : undefined}
                />
                <button
                  type="submit"
                  className="primary small"
                  disabled={rename.isPending}
                  aria-busy={rename.isPending}
                >
                  {rename.isPending ? (
                    <>
                      <Spinner /> Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
                <button
                  type="button"
                  className="ghost small"
                  disabled={rename.isPending}
                  onClick={() => {
                    setError(null);
                    setUsernameError(null);
                    setEditingUsername(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
              {usernameError && (
                <p className={styles.fieldError} id="account-username-error">
                  {usernameError}
                </p>
              )}
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
              aria-busy={remove.isPending}
              onClick={() => {
                setError(null);
                remove.mutate();
              }}
            >
              {remove.isPending ? (
                <>
                  <Spinner /> Quitando...
                </>
              ) : (
                "Quitar foto"
              )}
            </button>
          )}
        </div>
      </div>
      {error && (
        <Banner variant="error" alert>
          {error}
        </Banner>
      )}
    </section>
  );
}
