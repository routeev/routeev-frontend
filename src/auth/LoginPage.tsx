import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmEmail,
  googleLogin,
  login,
  register,
  requestPasswordReset,
  resendConfirmation,
  resetPassword,
  verifyPasswordResetCode,
} from "../api/auth";
import { ApiError } from "../api/client";
import { setSession } from "../api/session";
import { Banner } from "../shared/Banner";
import { Brand } from "../shared/Brand";
import { GraphBackground } from "../shared/GraphBackground";
import { Spinner } from "../shared/Spinner";
import { useTranslation } from "../i18n/LanguageProvider";
import { GoogleSignIn } from "./GoogleSignIn";
import styles from "./LoginPage.module.css";

type Mode = "login" | "register";
type View =
  | { name: "form" }
  | { name: "confirm"; email: string; notice?: string }
  | { name: "forgot" }
  // Codigo mandado, todavia sin validar contra el backend.
  | { name: "reset-code"; email: string }
  // Codigo ya validado (ver onVerifyCodeSubmit): recien acá se pide la
  // contraseña nueva, para no hacer escribirla dos veces solo para
  // enterarse al final de que el código estaba mal tipeado.
  | { name: "reset-password"; email: string; code: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormValues {
  email: string;
  password: string;
  /** Solo en "crear cuenta", y siempre opcional (ver onSubmit). */
  displayName: string;
}

interface ConfirmValues {
  code: string;
}

interface ForgotValues {
  email: string;
}

interface ResetCodeValues {
  code: string;
}

interface ResetPasswordValues {
  newPassword: string;
  confirmPassword: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get("crear") === "1" ? "register" : "login");
  const [view, setView] = useState<View>({ name: "form" });
  const [banner, setBanner] = useState<{ variant: "error" | "info"; message: string } | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<FormValues>({ defaultValues: { email: "", password: "", displayName: "" } });
  const confirmForm = useForm<ConfirmValues>({ defaultValues: { code: "" } });
  const forgotForm = useForm<ForgotValues>({ defaultValues: { email: "" } });
  const resetCodeForm = useForm<ResetCodeValues>({ defaultValues: { code: "" } });
  const resetPasswordForm = useForm<ResetPasswordValues>({ defaultValues: { newPassword: "", confirmPassword: "" } });

  function goToApp(session: { access_token: string; username: string }) {
    setSession(session.access_token, session.username);
    navigate("/app", { replace: true });
  }

  async function onSubmit(values: FormValues) {
    setBanner(null);
    const email = values.email.trim();
    try {
      // QA BAJO 25: el nombre visible salía derivado del correo ("pucho1394").
      // Ahora se puede elegir al crear la cuenta, sin dejar de ser opcional:
      // vacío se manda como si el campo no existiera, y register() ya se
      // encarga de que una API que todavía no lo acepta no rompa el alta.
      const result =
        mode === "login"
          ? await login(email, values.password)
          : await register(email, values.password, values.displayName);
      if (result.confirmation_required) {
        // Cuenta creada pero todavía sin token: falta el código que se
        // acaba de mandar por mail (ver RegisterResponse en backend/app/schemas.py).
        setView({
          name: "confirm",
          email: result.email,
          notice: t.auth.verifyEmail.notice(result.email),
        });
        return;
      }
      goToApp(result);
    } catch (err) {
      if (mode === "login" && err instanceof ApiError && err.status === 403) {
        // Credenciales correctas pero el correo todavía no fue confirmado:
        // en vez de dejar sin salida, se manda directo al paso de
        // confirmación, con la opción de reenviar el código.
        setView({ name: "confirm", email });
        setBanner({
          variant: "info",
          message: t.auth.login.unconfirmedNotice,
        });
      } else {
        setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.login.genericError });
      }
    }
  }

  async function onConfirmSubmit(values: ConfirmValues) {
    if (view.name !== "confirm") return;
    setBanner(null);
    try {
      goToApp(await confirmEmail(view.email, values.code.trim()));
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.verifyEmail.error });
    }
  }

  async function onResend() {
    if (view.name !== "confirm") return;
    setBanner(null);
    setResending(true);
    try {
      await resendConfirmation(view.email);
      setBanner({ variant: "info", message: t.auth.resendCode.success });
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.resendCode.error });
    } finally {
      setResending(false);
    }
  }

  async function onForgotSubmit(values: ForgotValues) {
    setBanner(null);
    const email = values.email.trim();
    try {
      // Siempre avanza al paso siguiente, exista o no la cuenta: el backend
      // responde 204 en los dos casos a propósito (anti-enumeración, ver
      // request_password_reset en backend/app/routes/auth_routes.py) -- si
      // acá se distinguiera, esta pantalla delataría por sí sola qué correos
      // están registrados. El error real (red caída, límite de pedidos) sí
      // se muestra y NO avanza, porque en ese caso el código nunca salió.
      await requestPasswordReset(email);
      setView({ name: "reset-code", email });
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.forgotPassword.error });
    }
  }

  async function onVerifyCodeSubmit(values: ResetCodeValues) {
    if (view.name !== "reset-code") return;
    setBanner(null);
    const code = values.code.trim();
    try {
      // No cambia nada todavía (ver verify_password_reset_code en
      // backend/app/routes/auth_routes.py: es de solo lectura, no consume el
      // código) -- solo confirma que vale la pena pedir la contraseña nueva
      // antes de hacerlo escribir dos veces.
      await verifyPasswordResetCode(view.email, code);
      setView({ name: "reset-password", email: view.email, code });
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.resetPassword.verifyError });
    }
  }

  async function onResetPasswordSubmit(values: ResetPasswordValues) {
    if (view.name !== "reset-password") return;
    setBanner(null);
    if (values.newPassword !== values.confirmPassword) {
      resetPasswordForm.setError("confirmPassword", { message: t.auth.resetPassword.passwordMismatch });
      return;
    }
    try {
      // El código ya se validó en el paso anterior, pero se vuelve a mandar
      // acá: el backend lo revalida igual (ver reset_password en
      // auth_routes.py), entre otras cosas por si venció justo en el medio.
      goToApp(await resetPassword(view.email, view.code, values.newPassword));
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.resetPassword.error });
    }
  }

  async function onResendReset() {
    if (view.name !== "reset-code" && view.name !== "reset-password") return;
    setBanner(null);
    setResending(true);
    try {
      await requestPasswordReset(view.email);
      setBanner({ variant: "info", message: t.auth.resendCode.success });
      // El código anterior (si el paso previo ya lo había validado) queda
      // invalidado por este reenvío (ver set_password_reset_code en
      // backend/app/database.py: uno nuevo reemplaza al pendiente) -- hay
      // que volver a pedirlo y validarlo de cero.
      if (view.name === "reset-password") setView({ name: "reset-code", email: view.email });
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.resendCode.error });
    } finally {
      setResending(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    setBanner(null);
    try {
      goToApp(await googleLogin(credential));
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : t.auth.login.googleError });
    }
  }

  function backToLogin() {
    setView({ name: "form" });
    setBanner(null);
  }

  const modeLabel =
    view.name === "confirm"
      ? t.auth.verifyEmail.modeLabel
      : view.name === "forgot"
        ? t.auth.forgotPassword.modeLabel
        : view.name === "reset-code" || view.name === "reset-password"
          ? t.auth.resetPassword.modeLabel
          : mode === "login"
            ? t.auth.login.modeLabelLogin
            : t.auth.login.modeLabelRegister;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.auth.login.pageTitle}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <GraphBackground />

      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>
          {t.auth.login.backToHome}
        </Link>
        <p className={["eyebrow", styles.eyebrow].join(" ")}>Uruguay</p>
        <h1 className={styles.brand}>
          <Brand size={26} />
        </h1>
        <p className={styles.tagline}>{t.auth.login.tagline}</p>
        <p className={styles.modeLabel}>{modeLabel}</p>

        {banner && <Banner variant={banner.variant}>{banner.message}</Banner>}

        {view.name === "form" ? (
          <>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="field">
                <label htmlFor="email">{t.auth.login.emailLabel}</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t.auth.login.emailPlaceholder}
                  {...form.register("email", {
                    required: true,
                    validate: (v) => EMAIL_RE.test(v.trim()) || t.auth.login.emailInvalid,
                  })}
                />
                {form.formState.errors.email && (
                  <p className={styles.fieldError}>{form.formState.errors.email.message || t.auth.login.emailInvalid}</p>
                )}
              </div>
              <div className="field">
                <label htmlFor="password">{t.auth.login.passwordLabel}</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  {...form.register("password", {
                    required: t.auth.login.passwordRequired,
                    validate: (v) =>
                      mode === "register" && v.length < 10 ? t.auth.login.passwordTooShort : true,
                  })}
                />
                {form.formState.errors.password && (
                  <p className={styles.fieldError}>{form.formState.errors.password.message}</p>
                )}
              </div>
              {mode === "register" && (
                <div className="field">
                  <label htmlFor="display-name">{t.auth.register.displayNameLabel}</label>
                  <input
                    id="display-name"
                    type="text"
                    autoComplete="nickname"
                    maxLength={32}
                    placeholder={t.auth.register.displayNamePlaceholder}
                    // Sin `required` y sin ninguna regla de validación a
                    // propósito: es el único campo del formulario que NUNCA
                    // puede frenar un alta. Dejarlo vacío es una opción
                    // legítima y el texto de abajo lo dice.
                    {...form.register("displayName")}
                  />
                  <p className={styles.fieldHint}>{t.auth.register.displayNameHint}</p>
                </div>
              )}
              <div className={styles.actions}>
                <button
                  type="submit"
                  className="primary"
                  disabled={form.formState.isSubmitting}
                  aria-busy={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Spinner /> {t.auth.login.submitting}
                    </>
                  ) : mode === "login" ? (
                    t.auth.login.submitLogin
                  ) : (
                    t.auth.login.submitRegister
                  )}
                </button>
                <button
                  type="button"
                  className={styles.toggleMode}
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setBanner(null);
                  }}
                >
                  {mode === "login" ? t.auth.login.toggleToRegister : t.auth.login.toggleToLogin}
                </button>
                {mode === "login" && (
                  <button
                    type="button"
                    className={styles.toggleMode}
                    onClick={() => {
                      setView({ name: "forgot" });
                      setBanner(null);
                    }}
                  >
                    {t.auth.login.forgotPasswordLink}
                  </button>
                )}
              </div>
            </form>

            <GoogleSignIn onCredential={onGoogleCredential} />
          </>
        ) : view.name === "confirm" ? (
          <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} noValidate>
            {view.notice && <p className={styles.tagline}>{view.notice}</p>}
            <div className="field">
              <label htmlFor="confirm-code">{t.auth.verifyEmail.codeLabel}</label>
              <input
                id="confirm-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                {...confirmForm.register("code", {
                  required: true,
                  validate: (v) => /^\d{6}$/.test(v.trim()) || t.auth.verifyEmail.codeInvalid,
                })}
              />
              {confirmForm.formState.errors.code && (
                <p className={styles.fieldError}>{confirmForm.formState.errors.code.message || t.auth.verifyEmail.codeInvalid}</p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="submit"
                className="primary"
                disabled={confirmForm.formState.isSubmitting}
                aria-busy={confirmForm.formState.isSubmitting}
              >
                {confirmForm.formState.isSubmitting ? (
                  <>
                    <Spinner /> {t.auth.verifyEmail.confirming}
                  </>
                ) : (
                  t.auth.verifyEmail.submit
                )}
              </button>
              <button type="button" className={styles.toggleMode} onClick={onResend} disabled={resending}>
                {t.auth.resendCode.button}
              </button>
              <button type="button" className={styles.toggleMode} onClick={backToLogin}>
                {t.auth.verifyEmail.backToLogin}
              </button>
            </div>
          </form>
        ) : view.name === "forgot" ? (
          <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} noValidate>
            <p className={styles.tagline}>{t.auth.forgotPassword.tagline}</p>
            <div className="field">
              <label htmlFor="forgot-email">{t.auth.login.emailLabel}</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder={t.auth.login.emailPlaceholder}
                {...forgotForm.register("email", {
                  required: true,
                  validate: (v) => EMAIL_RE.test(v.trim()) || t.auth.login.emailInvalid,
                })}
              />
              {forgotForm.formState.errors.email && (
                <p className={styles.fieldError}>{forgotForm.formState.errors.email.message || t.auth.login.emailInvalid}</p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="submit"
                className="primary"
                disabled={forgotForm.formState.isSubmitting}
                aria-busy={forgotForm.formState.isSubmitting}
              >
                {forgotForm.formState.isSubmitting ? (
                  <>
                    <Spinner /> {t.auth.forgotPassword.submitting}
                  </>
                ) : (
                  t.auth.forgotPassword.submit
                )}
              </button>
              <button type="button" className={styles.toggleMode} onClick={backToLogin}>
                {t.auth.forgotPassword.backToLogin}
              </button>
            </div>
          </form>
        ) : view.name === "reset-code" ? (
          <form onSubmit={resetCodeForm.handleSubmit(onVerifyCodeSubmit)} noValidate>
            <p className={styles.tagline}>{t.auth.resetPassword.notice(view.email)}</p>
            <div className="field">
              <label htmlFor="reset-code">{t.auth.resetPassword.codeLabel}</label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                {...resetCodeForm.register("code", {
                  required: true,
                  validate: (v) => /^\d{6}$/.test(v.trim()) || t.auth.resetPassword.codeInvalid,
                })}
              />
              {resetCodeForm.formState.errors.code && (
                <p className={styles.fieldError}>
                  {resetCodeForm.formState.errors.code.message || t.auth.resetPassword.codeInvalid}
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="submit"
                className="primary"
                disabled={resetCodeForm.formState.isSubmitting}
                aria-busy={resetCodeForm.formState.isSubmitting}
              >
                {resetCodeForm.formState.isSubmitting ? (
                  <>
                    <Spinner /> {t.auth.resetPassword.verifying}
                  </>
                ) : (
                  t.auth.resetPassword.verifyCode
                )}
              </button>
              <button type="button" className={styles.toggleMode} onClick={onResendReset} disabled={resending}>
                {t.auth.resetPassword.resendCode}
              </button>
              <button type="button" className={styles.toggleMode} onClick={backToLogin}>
                {t.auth.resetPassword.backToLogin}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} noValidate>
            <p className={styles.tagline}>{t.auth.resetPassword.codeVerifiedNotice}</p>
            <div className="field">
              <label htmlFor="reset-new-password">{t.auth.resetPassword.newPasswordLabel}</label>
              <input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...resetPasswordForm.register("newPassword", {
                  required: t.auth.login.passwordRequired,
                  validate: (v) => v.length >= 10 || t.auth.resetPassword.newPasswordTooShort,
                })}
              />
              {resetPasswordForm.formState.errors.newPassword && (
                <p className={styles.fieldError}>{resetPasswordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="reset-confirm-password">{t.auth.resetPassword.confirmPasswordLabel}</label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...resetPasswordForm.register("confirmPassword", { required: t.auth.resetPassword.passwordMismatch })}
              />
              {resetPasswordForm.formState.errors.confirmPassword && (
                <p className={styles.fieldError}>{resetPasswordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="submit"
                className="primary"
                disabled={resetPasswordForm.formState.isSubmitting}
                aria-busy={resetPasswordForm.formState.isSubmitting}
              >
                {resetPasswordForm.formState.isSubmitting ? (
                  <>
                    <Spinner /> {t.auth.resetPassword.submitting}
                  </>
                ) : (
                  t.auth.resetPassword.submit
                )}
              </button>
              <button type="button" className={styles.toggleMode} onClick={backToLogin}>
                {t.auth.resetPassword.backToLogin}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
