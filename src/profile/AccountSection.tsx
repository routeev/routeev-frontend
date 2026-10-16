import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, setSession, setUsername as setStoredUsername } from "../api/session";
import {
  changeMyPassword,
  confirmMyEmailChange,
  deleteMyAccount,
  deleteMyPhoto,
  getMe,
  requestMyEmailChange,
  updateMyDisplayName,
  updateMyUsername,
  uploadMyPhoto,
  type Me,
} from "../api/user";
import { useTranslation } from "../i18n/LanguageProvider";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { toast } from "../shared/toastStore";
import { ErrorNotice, Field, LoadError, OkNotice } from "./parts";
import { IconWarning } from "./profileIcons";
import styles from "./AccountSection.module.css";
import ui from "./ui.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Los límites del backend (ver updateMyUsername y MIN_PASSWORD_LENGTH).
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const MIN_PASSWORD = 10;

type Editing = null | "name" | "username" | "email" | "email-code" | "password";
type Key = "name" | "username" | "email" | "code" | "current" | "password" | "repeat";

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Mi cuenta: cada dato se edita en su fila, de a uno. */
export function AccountSection() {
  const { t } = useTranslation();
  const ac = t.profile.account;
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const uid = useId();
  const id = (k: Key) => `${uid}-${k}`;
  const editButtonId = (row: string) => `${uid}-edit-${row}`;

  const [editing, setEditing] = useState<Editing>(null);
  const [vals, setVals] = useState<Partial<Record<Key, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  // A dónde va el foco cuando se abre o se cierra una fila.
  const focusNext = useRef<string | null>(null);

  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  }, [editing]);

  function open(
    next: Exclude<Editing, null>,
    initial: Partial<Record<Key, string>>,
    firstField: Key
  ) {
    focusNext.current = id(firstField);
    setVals(initial);
    setErrors({});
    setApiError(null);
    setInfo(null);
    setEditing(next);
  }

  function close(row: string) {
    focusNext.current = editButtonId(row);
    setErrors({});
    setApiError(null);
    setInfo(null);
    setEditing(null);
  }

  function setValue(k: Key, v: string) {
    setVals((prev) => ({ ...prev, [k]: k === "code" ? v.replace(/\D/g, "").slice(0, 6) : v }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
    setApiError(null);
  }

  /** Marca los errores y lleva el foco al primero; devuelve si hubo alguno. */
  function invalid(found: Partial<Record<Key, string>>, order: Key[]) {
    setErrors(found);
    const first = order.find((k) => found[k]);
    if (first) document.getElementById(id(first))?.focus();
    return Boolean(first);
  }

  const saved = (user: Me) => queryClient.setQueryData(["me"], user);
  const failed = (err: unknown) => setApiError(message(err, ac.saveError));

  const saveName = useMutation({
    mutationFn: (name: string) => updateMyDisplayName(name),
    onSuccess: (user) => {
      saved(user);
      close("name");
      toast.ok(user.display_name ? ac.savedName : ac.clearedName);
    },
    onError: failed,
  });

  const saveUsername = useMutation({
    mutationFn: (username: string) => updateMyUsername(username),
    onSuccess: (user) => {
      saved(user);
      // El header la usa de respaldo mientras no llega /me.
      setStoredUsername(user.username);
      close("username");
      toast.ok(ac.savedUsername);
    },
    onError: failed,
  });

  const requestEmail = useMutation({
    mutationFn: (email: string) => requestMyEmailChange(email),
    onSuccess: (res, email) => {
      if (res.confirmation_required) {
        setPendingEmail(res.new_email || email);
        open("email-code", { code: "" }, "code");
      } else {
        // Sin envío de mail configurado el correo cambia directo.
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        close("email");
        toast.ok(ac.savedEmail(res.new_email));
      }
    },
    onError: failed,
  });

  const resendEmail = useMutation({
    mutationFn: () => requestMyEmailChange(pendingEmail),
    onSuccess: () => {
      setVals({ code: "" });
      setInfo(ac.resent);
    },
    onError: failed,
  });

  const confirmEmail = useMutation({
    mutationFn: (code: string) => confirmMyEmailChange(code),
    onSuccess: (user) => {
      saved(user);
      close("email");
      toast.ok(ac.savedEmail(user.email));
    },
    onError: failed,
  });

  const savePassword = useMutation({
    mutationFn: ({ current, password }: { current: string; password: string }) =>
      changeMyPassword(current, password),
    onSuccess: (session) => {
      // El cambio invalida los tokens viejos: sin guardar el nuevo, la sesión
      // se cortaría acá mismo.
      setSession(session.access_token, session.username);
      close("password");
      toast.ok(ac.savedPassword);
    },
    onError: failed,
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => uploadMyPhoto(await resizePhotoForUpload(file)),
    onSuccess: (user) => {
      saved(user);
      toast.ok(ac.photoSaved);
    },
    onError: (err) => toast.error(message(err, ac.photoError)),
  });

  const removePhoto = useMutation({
    mutationFn: deleteMyPhoto,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.ok(ac.photoRemoved);
    },
    onError: (err) => toast.error(message(err, ac.photoRemoveError)),
  });

  const busy =
    saveName.isPending ||
    saveUsername.isPending ||
    requestEmail.isPending ||
    confirmEmail.isPending ||
    savePassword.isPending;

  const user = me.data;

  function submit(e: FormEvent, action: () => void) {
    e.preventDefault();
    if (!busy) action();
  }

  const onSaveName = (e: FormEvent) =>
    submit(e, () => {
      const name = (vals.name ?? "").trim();
      if (name === (user?.display_name ?? "")) return close("name");
      saveName.mutate(name);
    });

  const onSaveUsername = (e: FormEvent) =>
    submit(e, () => {
      const username = (vals.username ?? "").trim();
      if (username === user?.username) return close("username");
      const ok =
        username.length >= USERNAME_MIN && username.length <= USERNAME_MAX && !/\s/.test(username);
      if (invalid(ok ? {} : { username: ac.errUsername }, ["username"])) return;
      saveUsername.mutate(username);
    });

  const onSendCode = (e: FormEvent) =>
    submit(e, () => {
      const email = (vals.email ?? "").trim();
      if (invalid(EMAIL_RE.test(email) ? {} : { email: ac.errEmail }, ["email"])) return;
      requestEmail.mutate(email);
    });

  const onConfirmEmail = (e: FormEvent) =>
    submit(e, () => {
      const code = vals.code ?? "";
      if (invalid(/^\d{6}$/.test(code) ? {} : { code: ac.errCode }, ["code"])) return;
      confirmEmail.mutate(code);
    });

  const onSavePassword = (e: FormEvent) =>
    submit(e, () => {
      const found: Partial<Record<Key, string>> = {};
      if (!vals.current) found.current = ac.errCurrent;
      if ((vals.password ?? "").length < MIN_PASSWORD) found.password = ac.errPassword;
      else if (vals.password !== vals.repeat) found.repeat = ac.errMismatch;
      if (invalid(found, ["current", "password", "repeat"])) return;
      savePassword.mutate({ current: vals.current!, password: vals.password! });
    });

  const field = (k: Key, label: string, extra: Partial<Parameters<typeof Field>[0]> = {}) => (
    <Field
      key={k}
      id={id(k)}
      label={label}
      value={vals[k] ?? ""}
      onChange={(v) => setValue(k, v)}
      error={errors[k]}
      {...extra}
    />
  );

  const status = { busy, apiError, info };

  return (
    <>
      <section id="cuenta" aria-labelledby="h-cuenta" className={styles.section}>
        <div className={styles.headText}>
          <h2 id="h-cuenta" className={styles.title}>
            {ac.title}
          </h2>
          <p className={styles.subtitle}>{ac.subtitle}</p>
        </div>

        {me.isPending ? (
          <div
            role="status"
            aria-label={ac.loading}
            className={`${ui.skeleton} ${styles.skeleton}`}
          />
        ) : me.isError || !user ? (
          <LoadError title={ac.error} onRetry={() => void me.refetch()} />
        ) : (
          <ul className={styles.rows}>
            <li className={styles.row}>
              <div className={styles.rowView}>
                <span className={styles.avatar}>
                  {user.photo_url ? (
                    <img src={cloudinaryResize(user.photo_url, 96) ?? user.photo_url} alt="" />
                  ) : (
                    (user.display_name || user.username).charAt(0).toUpperCase()
                  )}
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowLabel}>{ac.photo}</span>
                  <span className={styles.rowValue}>
                    {user.photo_url ? ac.photoSet : ac.photoNone}
                  </span>
                </span>
                <span className={styles.rowActions}>
                  {user.photo_url && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      disabled={removePhoto.isPending}
                      onClick={() => removePhoto.mutate()}
                    >
                      {ac.remove}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${ui.outline} ${ui.small}`}
                    disabled={uploadPhoto.isPending}
                    onClick={() => photoInput.current?.click()}
                  >
                    {uploadPhoto.isPending && <span className={ui.spinner} aria-hidden="true" />}
                    {user.photo_url ? ac.change : ac.upload}
                  </button>
                </span>
              </div>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) uploadPhoto.mutate(file);
                }}
              />
            </li>

            <Row
              editing={editing === "name"}
              label={ac.name}
              value={user.display_name || ac.nameEmpty(user.username)}
              muted={!user.display_name}
              buttonId={editButtonId("name")}
              onEdit={() => open("name", { name: user.display_name ?? "" }, "name")}
            >
              <EditForm
                {...status}
                title={ac.nameTitle}
                body={ac.nameBody}
                submitLabel={t.profile.common.save}
                onSubmit={onSaveName}
                onCancel={() => close("name")}
                fields={field("name", ac.name, {
                  optional: ac.optional,
                  autoComplete: "nickname",
                  maxLength: 80,
                  placeholder: "Marcela",
                })}
              />
            </Row>

            <Row
              editing={editing === "username"}
              label={ac.username}
              value={`@${user.username}`}
              buttonId={editButtonId("username")}
              onEdit={() => open("username", { username: user.username }, "username")}
            >
              <EditForm
                {...status}
                title={ac.usernameTitle}
                body={ac.usernameBody}
                submitLabel={t.profile.common.save}
                onSubmit={onSaveUsername}
                onCancel={() => close("username")}
                fields={field("username", ac.username, {
                  autoComplete: "username",
                  maxLength: USERNAME_MAX,
                })}
              />
            </Row>

            <Row
              editing={editing === "email" || editing === "email-code"}
              label={ac.email}
              value={user.email}
              buttonId={editButtonId("email")}
              onEdit={() => open("email", { email: "" }, "email")}
            >
              {editing === "email" ? (
                <EditForm
                  {...status}
                  step={ac.emailStep1}
                  title={ac.emailTitle1}
                  body={
                    <>
                      {ac.emailBody1}
                      <strong>{user.email}</strong>.
                    </>
                  }
                  submitLabel={ac.sendCode}
                  onSubmit={onSendCode}
                  onCancel={() => close("email")}
                  fields={field("email", ac.emailNew, {
                    type: "email",
                    inputMode: "email",
                    autoComplete: "email",
                    placeholder: "nombre@dominio.com",
                  })}
                />
              ) : (
                <EditForm
                  {...status}
                  step={ac.emailStep2}
                  title={ac.emailTitle2}
                  body={
                    <>
                      {ac.emailBody2Before}
                      <strong>{pendingEmail}</strong>
                      {ac.emailBody2After}
                    </>
                  }
                  submitLabel={ac.confirm}
                  onSubmit={onConfirmEmail}
                  onCancel={() => close("email")}
                  fields={field("code", ac.code, {
                    code: true,
                    inputMode: "numeric",
                    autoComplete: "one-time-code",
                    placeholder: "000000",
                  })}
                  tertiary={{
                    label: ac.resend,
                    onClick: () => resendEmail.mutate(),
                    busy: resendEmail.isPending,
                  }}
                />
              )}
            </Row>

            <Row
              editing={editing === "password"}
              label={ac.password}
              value="••••••••••"
              buttonId={editButtonId("password")}
              onEdit={() => open("password", { current: "", password: "", repeat: "" }, "current")}
            >
              <EditForm
                {...status}
                title={ac.passwordTitle}
                submitLabel={t.profile.common.save}
                onSubmit={onSavePassword}
                onCancel={() => close("password")}
                wide
                fields={
                  <>
                    {field("current", ac.currentPassword, {
                      type: "password",
                      autoComplete: "current-password",
                    })}
                    {field("password", ac.newPassword, {
                      type: "password",
                      autoComplete: "new-password",
                      hint: ac.passwordRule,
                    })}
                    {field("repeat", ac.repeatPassword, {
                      type: "password",
                      autoComplete: "new-password",
                    })}
                  </>
                }
              />
            </Row>
          </ul>
        )}
      </section>

      <DeleteAccount />
    </>
  );
}

interface RowProps {
  editing: boolean;
  label: string;
  value: string;
  muted?: boolean;
  buttonId: string;
  onEdit: () => void;
  children: ReactNode;
}

/** La fila de un dato: label, valor y "Cambiar"; al editar, su formulario en el lugar. */
function Row({ editing, label, value, muted = false, buttonId, onEdit, children }: RowProps) {
  const { t } = useTranslation();
  const ac = t.profile.account;
  return (
    <li className={editing ? styles.rowEditing : styles.row}>
      {editing ? (
        children
      ) : (
        <div className={styles.rowView}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>{label}</span>
            <span className={muted ? styles.rowValueMuted : styles.rowValue}>{value}</span>
          </span>
          <span className={styles.rowActions}>
            <button
              id={buttonId}
              type="button"
              className={`${ui.outline} ${ui.small}`}
              aria-label={ac.changeLabel(label)}
              onClick={onEdit}
            >
              {ac.change}
            </button>
          </span>
        </div>
      )}
    </li>
  );
}

interface EditFormProps {
  step?: string;
  title: string;
  body?: ReactNode;
  fields: ReactNode;
  /** Contraseña: tres campos en fila en escritorio. */
  wide?: boolean;
  submitLabel: string;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  tertiary?: { label: string; onClick: () => void; busy: boolean };
  busy: boolean;
  apiError: string | null;
  info: string | null;
}

function EditForm({
  step,
  title,
  body,
  fields,
  wide,
  submitLabel,
  onSubmit,
  onCancel,
  tertiary,
  busy,
  apiError,
  info,
}: EditFormProps) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-labelledby={titleId}>
      <div className={styles.formHead}>
        {step && (
          <p className={ui.eyebrow}>
            <span className={ui.eyebrowDot} aria-hidden="true" />
            {step}
          </p>
        )}
        <h3 id={titleId} className={styles.formTitle}>
          {title}
        </h3>
        {body && <p className={styles.formBody}>{body}</p>}
      </div>
      {apiError && <ErrorNotice>{apiError}</ErrorNotice>}
      <div role="status">{info && <OkNotice mail>{info}</OkNotice>}</div>
      <div className={wide ? styles.fieldsWide : styles.fields}>{fields}</div>
      <div className={styles.formActions}>
        <button type="submit" className={ui.primary} disabled={busy} aria-busy={busy}>
          {busy && <span className={ui.spinnerOnAccent} aria-hidden="true" />}
          {submitLabel}
        </button>
        <button type="button" className={ui.outline} onClick={onCancel}>
          {t.profile.common.cancel}
        </button>
        {tertiary && (
          <button
            type="button"
            className={ui.textAction}
            onClick={tertiary.onClick}
            disabled={tertiary.busy}
          >
            {tertiary.label}
          </button>
        )}
      </div>
    </form>
  );
}

/** Al final de todo y aparte: lo peligroso se ve peligroso recién cuando hace falta. */
function DeleteAccount() {
  const { t } = useTranslation();
  const d = t.profile.deleteAccount;
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (returnFocus.current) startRef.current?.focus();
    returnFocus.current = false;
  }, [confirming]);

  const remove = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      clearSession();
      navigate("/");
    },
  });

  return (
    <section id="eliminar" aria-labelledby="h-eliminar" className={styles.danger}>
      <div className={styles.headText}>
        <h2 id="h-eliminar" className={styles.dangerTitle}>
          {d.title}
        </h2>
        <p className={styles.subtitle}>{d.body}</p>
      </div>
      {confirming ? (
        <div role="alert" className={styles.dangerConfirm}>
          <p className={styles.dangerSure}>
            <IconWarning />
            {d.sure}
          </p>
          {remove.isError && <ErrorNotice>{message(remove.error, d.error)}</ErrorNotice>}
          <div className={styles.formActions}>
            <button
              ref={cancelRef}
              type="button"
              className={`${ui.outline} ${styles.dangerCancel}`}
              onClick={() => {
                returnFocus.current = true;
                remove.reset();
                setConfirming(false);
              }}
            >
              {t.profile.common.cancel}
            </button>
            <button
              type="button"
              className={ui.dangerFill}
              disabled={remove.isPending}
              aria-busy={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending && <span className={ui.spinnerOnDanger} aria-hidden="true" />}
              {d.confirm}
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={startRef}
          type="button"
          className={`${ui.dangerOutline} ${styles.dangerStart}`}
          onClick={() => setConfirming(true)}
        >
          {d.button}
        </button>
      )}
    </section>
  );
}
