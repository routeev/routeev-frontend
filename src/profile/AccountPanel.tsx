import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeMyPassword,
  confirmMyEmailChange,
  deleteMyAccount,
  deleteMyPhoto,
  getMe,
  nombreParaMostrar,
  requestMyEmailChange,
  updateMyDisplayName,
  updateMyUsername,
  uploadMyPhoto,
  type Me,
} from "../api/user";
import { clearSession, setSession, setUsername as setStoredUsername } from "../api/session";
import { Banner } from "../shared/Banner";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { useTranslation } from "../i18n/LanguageProvider";
import { LanguageSwitcher } from "../shared/LanguageSwitcher";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { Spinner } from "../shared/Spinner";
import { ThemeSwitcher } from "../shared/ThemeSwitcher";
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
  const { t } = useTranslation();
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
      toast.ok(t.profile.account.photoUploadOk);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : t.profile.account.photoUploadError),
  });

  const remove = useMutation({
    mutationFn: deleteMyPhoto,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.ok(t.profile.account.photoRemoveOk);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : t.profile.account.photoRemoveError),
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
      toast.ok(t.profile.account.usernameUpdated(user.username));
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : t.profile.account.usernameUpdateError),
  });

  const user = meQuery.data;

  return (
    <section className="panel">
      <div className={styles.panelHeader}>
        <h2>{t.profile.account.title}</h2>
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
          <label className={styles.photoEdit} title={t.profile.account.changePhoto}>
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
            <span className="sr-only">{t.profile.account.changePhoto}</span>
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
                    t.profile.account.usernameLengthError(USERNAME_MIN, USERNAME_MAX)
                  );
                  // El foco se queda en "Guardar" si no se mueve, y el error se
                  // pinta abajo: quien tiene los ojos en el botón, o usa lector
                  // de pantalla, no se entera de nada. Mismo patrón que ya usan
                  // AddVehicleForm y SimulationForm.
                  requestAnimationFrame(() => document.getElementById("account-username")?.focus());
                  return;
                }
                rename.mutate(trimmed);
              }}
            >
              {/* <label> de verdad, con htmlFor: el campo aparece EN LUGAR del
                  nombre, así que sin esto no hay nada en pantalla que diga qué
                  se está editando -- ni para quien ve, ni para un lector de
                  pantalla, que solo anunciaba "cuadro de edición". */}
              <label htmlFor="account-username">{t.profile.account.usernameLabel}</label>
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
                      <Spinner /> {t.common.saving}
                    </>
                  ) : (
                    t.common.save
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
                  {t.common.cancel}
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
              {/* El nombre propio manda: es lo que la persona escribió de sí
                  misma. El nombre de usuario queda debajo, en chico, porque es
                  un identificador y no como se llama. Sin esto, el registro
                  prometía "es cómo te vamos a mostrar en la app" y después
                  todas las pantallas seguían diciendo "pucho1394". */}
              <span className={styles.accountUsername}>{nombreParaMostrar(user) || "-"}</span>
              <button
                type="button"
                className={styles.usernameEditBtn}
                title={t.profile.account.changeUsername}
                onClick={() => {
                  setError(null);
                  setUsernameInput(user?.username ?? "");
                  setEditingUsername(true);
                }}
              >
                <span aria-hidden="true">✎</span>
                <span className="sr-only">{t.profile.account.changeUsername}</span>
              </button>
            </div>
          )}
          {user?.display_name && <div className="hint">@{user.username}</div>}
          <DisplayNameField user={user ?? null} onError={setError} />
          <EmailField user={user ?? null} onError={setError} />
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
                  <Spinner /> {t.profile.account.removingPhoto}
                </>
              ) : (
                t.profile.account.removePhoto
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
      <div className={styles.preferencesRow}>
        <span className="hint">{t.profile.account.preferencesLabel}</span>
        <div className={styles.preferencesControls}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
      <PasswordField />
      <DeleteAccountSection />
    </section>
  );
}

/**
 * Tu nombre, el propio, el que se muestra en la app.
 *
 * QA BAJO 25: el nombre salía del prefijo del correo, así que alguien se veía
 * "pucho1394" en su propio perfil y en su historial de viajes. El registro ya
 * lo pide (opcional), y esto es la otra mitad de esa promesa: sin una forma de
 * editarlo acá, el texto del alta ("lo podés cambiar cuando quieras desde tu
 * perfil") era mentira.
 *
 * Vacío es un valor válido y significa "sacámelo": vuelve a verse el nombre de
 * usuario. Por eso no hay validación de largo mínimo ni alfabeto -- es un
 * nombre propio, lleva tildes, espacios y mayúsculas.
 */
function DisplayNameField({ user, onError }: { user: Me | null; onError: (msg: string | null) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");

  const guardar = useMutation({
    mutationFn: updateMyDisplayName,
    onSuccess: (actualizado) => {
      queryClient.setQueryData(["me"], actualizado);
      setEditando(false);
      toast.ok(
        actualizado.display_name
          ? t.profile.account.displayNameUpdatedNamed
          : t.profile.account.displayNameUpdatedCleared
      );
    },
    onError: (err) =>
      onError(err instanceof Error ? err.message : t.profile.account.displayNameUpdateError),
  });

  if (!editando) {
    // Icono solo, no el botón de texto que tenía antes ("Cambiar mi nombre" /
    // "Poné tu nombre"): pedido explícito, mismo tratamiento que el lápiz de
    // usuario/correo (usernameEditBtn) para que las tres ediciones de "Mi
    // cuenta" se vean como una sola convención, no una mezcla de botones de
    // texto y iconos.
    const label = user?.display_name ? t.profile.account.changeDisplayName : t.profile.account.setDisplayName;
    return (
      <button
        type="button"
        className={styles.usernameEditBtn}
        title={label}
        onClick={() => {
          onError(null);
          setValor(user?.display_name ?? "");
          setEditando(true);
        }}
      >
        <span aria-hidden="true">✎</span>
        <span className="sr-only">{label}</span>
      </button>
    );
  }

  return (
    <form
      className={styles.usernameEditForm}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        guardar.mutate(valor.trim());
      }}
    >
      <label htmlFor="account-display-name">{t.profile.account.displayNameLabel}</label>
      <div className={styles.usernameEditRow}>
        <input
          id="account-display-name"
          type="text"
          autoComplete="name"
          placeholder={t.profile.account.displayNamePlaceholder}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          maxLength={80}
          autoFocus
          disabled={guardar.isPending}
        />
        <button type="submit" className="primary small" disabled={guardar.isPending} aria-busy={guardar.isPending}>
          {guardar.isPending ? (
            <>
              <Spinner /> {t.common.saving}
            </>
          ) : (
            t.common.save
          )}
        </button>
        <button
          type="button"
          className="ghost small"
          disabled={guardar.isPending}
          onClick={() => {
            onError(null);
            setEditando(false);
          }}
        >
          {t.common.cancel}
        </button>
      </div>
      <p className="hint">{t.profile.account.displayNameHint}</p>
    </form>
  );
}

/**
 * Tu correo. Cambio en dos pasos: pedirlo (manda un código de 6 dígitos a la
 * casilla NUEVA, nunca a la vieja) y confirmarlo con ese código -- el correo
 * de la cuenta no cambia hasta que se prueba que esa casilla nueva responde
 * de verdad (ver api/user.ts#requestMyEmailChange/confirmMyEmailChange).
 *
 * Si el servidor no tiene Resend configurado no hay como mandar el código:
 * `confirmation_required` en la respuesta dice cuál de los dos caminos
 * corresponde, y con eso en false el cambio ya se aplicó solo -- este
 * componente ni pasa por el paso de código.
 */
function EmailField({ user, onError }: { user: Me | null; onError: (msg: string | null) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"idle" | "editing" | "confirming">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  function volverAIdle() {
    onError(null);
    setInfo(null);
    setCode("");
    setStep("idle");
  }

  const request = useMutation({
    mutationFn: (email: string) => requestMyEmailChange(email),
    onSuccess: (res) => {
      if (res.confirmation_required) {
        setInfo(t.profile.account.emailChangeRequested(res.new_email));
        setStep("confirming");
      } else {
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        toast.ok(t.profile.account.emailChangeApplied(res.new_email));
        setStep("idle");
      }
    },
    onError: (err) => onError(err instanceof Error ? err.message : t.profile.account.emailChangeRequestError),
  });

  const confirm = useMutation({
    mutationFn: (code: string) => confirmMyEmailChange(code),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.ok(t.profile.account.emailChangeConfirmed);
      volverAIdle();
    },
    onError: (err) => onError(err instanceof Error ? err.message : t.profile.account.emailChangeConfirmError),
  });

  if (step === "idle") {
    return (
      <div className={styles.usernameRow}>
        <span className="hint">{user?.email ?? ""}</span>
        <button
          type="button"
          className={styles.usernameEditBtn}
          title={t.profile.account.changeEmail}
          onClick={() => {
            onError(null);
            setNewEmail("");
            setStep("editing");
          }}
        >
          <span aria-hidden="true">✎</span>
          <span className="sr-only">{t.profile.account.changeEmail}</span>
        </button>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <form
        className={styles.usernameEditForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onError(null);
          confirm.mutate(code.trim());
        }}
      >
        <label htmlFor="account-email-code">{t.profile.account.emailCodeLabel}</label>
        {info && <p className="hint">{info}</p>}
        <div className={styles.usernameEditRow}>
          <input
            id="account-email-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t.profile.account.emailCodePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            autoFocus
            disabled={confirm.isPending}
          />
          <button type="submit" className="primary small" disabled={confirm.isPending} aria-busy={confirm.isPending}>
            {confirm.isPending ? (
              <>
                <Spinner /> {t.profile.account.confirmingEmailChange}
              </>
            ) : (
              t.profile.account.confirmEmailChange
            )}
          </button>
          <button type="button" className="ghost small" disabled={confirm.isPending} onClick={volverAIdle}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className={styles.usernameEditForm}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        const trimmed = newEmail.trim();
        // Igual al correo actual (o vacío) no es un error: es "me arrepentí".
        if (!trimmed || trimmed === user?.email) {
          setStep("idle");
          return;
        }
        request.mutate(trimmed);
      }}
    >
      <label htmlFor="account-email">{t.profile.account.newEmailLabel}</label>
      <div className={styles.usernameEditRow}>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          placeholder={t.profile.account.newEmailPlaceholder}
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          autoFocus
          disabled={request.isPending}
        />
        <button type="submit" className="primary small" disabled={request.isPending} aria-busy={request.isPending}>
          {request.isPending ? (
            <>
              <Spinner /> {t.profile.account.requestingEmailChange}
            </>
          ) : (
            t.common.save
          )}
        </button>
        <button
          type="button"
          className="ghost small"
          disabled={request.isPending}
          onClick={() => {
            onError(null);
            setStep("idle");
          }}
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

/**
 * Cambiar contraseña, validando la actual primero (ver
 * api/user.ts#changeMyPassword). El backend invalida todos los tokens ya
 * emitidos al cambiarla y devuelve uno nuevo -- setSession lo guarda para
 * que ESTA sesión siga andando; sin eso, cambiar tu propia contraseña te
 * dejaría deslogueado de inmediato.
 *
 * Envuelto en su propia sección con separador (.passwordSection, no un botón
 * suelto): antes quedaba pegado justo debajo de .preferencesRow, que en
 * escritorio es display:none (solo existe en mobile, ver el comentario de esa
 * clase) -- ahí el botón de contraseña quedaba sin ningún aire arriba,
 * pegado directo al bloque de "Mi cuenta".
 */
function PasswordField() {
  const { t } = useTranslation();
  const [editando, setEditando] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cambiar = useMutation({
    mutationFn: () => changeMyPassword(actual, nueva),
    onSuccess: (session) => {
      setSession(session.access_token, session.username);
      setEditando(false);
      setActual("");
      setNueva("");
      setConfirmacion("");
      setError(null);
      toast.ok(t.profile.account.passwordChanged);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t.profile.account.passwordChangeError),
  });

  if (!editando) {
    return (
      <div className={styles.passwordSection}>
        <button
          type="button"
          className="ghost small"
          onClick={() => {
            setError(null);
            setActual("");
            setNueva("");
            setConfirmacion("");
            setEditando(true);
          }}
        >
          {t.profile.account.changePassword}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.passwordSection}>
      <form
        className={styles.usernameEditForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          // Mismo mínimo que el backend (MIN_PASSWORD_LENGTH en schemas.py):
          // se valida acá primero para no gastar un pedido HTTP (ni el rate
          // limit de intentos) en algo que ya se sabe que va a fallar.
          if (nueva.length < 10) {
            setError(t.profile.account.newPasswordHint);
            return;
          }
          if (nueva !== confirmacion) {
            setError(t.profile.account.passwordMismatchError);
            return;
          }
          cambiar.mutate();
        }}
      >
        <label htmlFor="account-current-password">{t.profile.account.currentPasswordLabel}</label>
        <div className={styles.usernameEditRow}>
          <input
            id="account-current-password"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoFocus
            disabled={cambiar.isPending}
          />
        </div>
        <label htmlFor="account-new-password">{t.profile.account.newPasswordLabel}</label>
        <div className={styles.usernameEditRow}>
          <input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            disabled={cambiar.isPending}
          />
        </div>
        <label htmlFor="account-new-password-confirm">{t.profile.account.confirmNewPasswordLabel}</label>
        <div className={styles.usernameEditRow}>
          <input
            id="account-new-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            disabled={cambiar.isPending}
          />
        </div>
        <p className="hint">{t.profile.account.newPasswordHint}</p>
        <div className={styles.usernameEditRow}>
          <button type="submit" className="primary small" disabled={cambiar.isPending} aria-busy={cambiar.isPending}>
            {cambiar.isPending ? (
              <>
                <Spinner /> {t.profile.account.changingPassword}
              </>
            ) : (
              t.common.save
            )}
          </button>
          <button
            type="button"
            className="ghost small"
            disabled={cambiar.isPending}
            onClick={() => {
              setError(null);
              setEditando(false);
            }}
          >
            {t.common.cancel}
          </button>
        </div>
        {error && <p className={styles.fieldError}>{error}</p>}
      </form>
    </div>
  );
}

/**
 * Borrar la cuenta para siempre (ver api/user.ts#deleteMyAccount) -- vehículos
 * e historial de viajes se van con ella (cascada del lado del backend).
 * Confirmación en dos pasos DENTRO de la pantalla, no window.confirm() como
 * borrar un vehículo (VehiclesPanel.tsx): esto es bastante más destructivo
 * (se lleva la cuenta entera, no un auto), amerita un paso propio en vez de
 * un popup del navegador que un Enter distraído cierra sin querer.
 */
function DeleteAccountSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eliminar = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      clearSession();
      navigate("/");
    },
    onError: (err) => setError(err instanceof Error ? err.message : t.profile.account.deleteAccountError),
  });

  return (
    <div className={styles.dangerZone}>
      <h3 className={styles.dangerZoneTitle}>{t.profile.account.dangerZoneTitle}</h3>
      <p className="hint">{t.profile.account.deleteAccountHint}</p>
      {confirming && <p className={styles.fieldError}>{t.profile.account.deleteAccountConfirmQuestion}</p>}
      {confirming ? (
        <div className={styles.usernameEditRow}>
          <button
            type="button"
            className="danger small"
            disabled={eliminar.isPending}
            aria-busy={eliminar.isPending}
            onClick={() => {
              setError(null);
              eliminar.mutate();
            }}
          >
            {eliminar.isPending ? (
              <>
                <Spinner /> {t.profile.account.deletingAccount}
              </>
            ) : (
              t.profile.account.deleteAccountConfirmButton
            )}
          </button>
          <button
            type="button"
            className="ghost small"
            disabled={eliminar.isPending}
            onClick={() => {
              setError(null);
              setConfirming(false);
            }}
          >
            {t.common.cancel}
          </button>
        </div>
      ) : (
        <button type="button" className="ghost small" onClick={() => setConfirming(true)}>
          {t.profile.account.deleteAccount}
        </button>
      )}
      {error && (
        <Banner variant="error" alert>
          {error}
        </Banner>
      )}
    </div>
  );
}
