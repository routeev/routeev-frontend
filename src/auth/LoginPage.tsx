import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmEmail, googleLogin, login, register, resendConfirmation } from "../api/auth";
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
type View = { name: "form" } | { name: "confirm"; email: string; notice?: string };

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
              </div>
            </form>

            <GoogleSignIn onCredential={onGoogleCredential} />
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
