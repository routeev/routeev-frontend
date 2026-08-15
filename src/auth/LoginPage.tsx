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
          notice: `Te mandamos un código de 6 dígitos a ${result.email}. Ingresalo para confirmar tu cuenta.`,
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
          message: "Tu correo todavía no está confirmado. Si no tenés el código a mano, pedí que te lo reenviemos.",
        });
      } else {
        setBanner({ variant: "error", message: err instanceof Error ? err.message : "No se pudo completar la operación" });
      }
    }
  }

  async function onConfirmSubmit(values: ConfirmValues) {
    if (view.name !== "confirm") return;
    setBanner(null);
    try {
      goToApp(await confirmEmail(view.email, values.code.trim()));
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : "No se pudo confirmar el correo" });
    }
  }

  async function onResend() {
    if (view.name !== "confirm") return;
    setBanner(null);
    setResending(true);
    try {
      await resendConfirmation(view.email);
      setBanner({ variant: "info", message: "Te reenviamos el código. Puede tardar unos minutos en llegar." });
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : "No se pudo reenviar el código" });
    } finally {
      setResending(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    setBanner(null);
    try {
      goToApp(await googleLogin(credential));
    } catch (err) {
      setBanner({ variant: "error", message: err instanceof Error ? err.message : "No se pudo iniciar sesión con Google" });
    }
  }

  function backToLogin() {
    setView({ name: "form" });
    setBanner(null);
  }

  const modeLabel = view.name === "confirm" ? "Confirmá tu correo" : mode === "login" ? "Iniciar sesión" : "Crear cuenta";

  return (
    <div className={styles.page}>
      <Helmet>
        <title>RouteEV · Iniciar sesión</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <GraphBackground />

      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>
          ← Volver al inicio
        </Link>
        <p className={["eyebrow", styles.eyebrow].join(" ")}>Uruguay</p>
        <h1 className={styles.brand}>
          <Brand size={26} />
        </h1>
        <p className={styles.tagline}>Entrá a tu cuenta para calcular tu próxima ruta.</p>
        <p className={styles.modeLabel}>{modeLabel}</p>

        {banner && <Banner variant={banner.variant}>{banner.message}</Banner>}

        {view.name === "form" ? (
          <>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ej. nombre@dominio.com"
                  {...form.register("email", {
                    required: true,
                    validate: (v) => EMAIL_RE.test(v.trim()) || "Ingresá un correo electrónico válido.",
                  })}
                />
                {form.formState.errors.email && (
                  <p className={styles.fieldError}>{form.formState.errors.email.message || "Ingresá un correo electrónico válido."}</p>
                )}
              </div>
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  {...form.register("password", {
                    required: "Escribí tu contraseña.",
                    validate: (v) =>
                      mode === "register" && v.length < 10 ? "La contraseña necesita al menos 10 caracteres." : true,
                  })}
                />
                {form.formState.errors.password && (
                  <p className={styles.fieldError}>{form.formState.errors.password.message}</p>
                )}
              </div>
              {mode === "register" && (
                <div className="field">
                  <label htmlFor="display-name">Nombre (opcional)</label>
                  <input
                    id="display-name"
                    type="text"
                    autoComplete="nickname"
                    maxLength={32}
                    placeholder="ej. Marcela"
                    // Sin `required` y sin ninguna regla de validación a
                    // propósito: es el único campo del formulario que NUNCA
                    // puede frenar un alta. Dejarlo vacío es una opción
                    // legítima y el texto de abajo lo dice.
                    {...form.register("displayName")}
                  />
                  <p className={styles.fieldHint}>
                    Es cómo te vamos a mostrar en la app. Si lo dejás vacío te ponemos uno y lo
                    podés cambiar cuando quieras desde tu perfil.
                  </p>
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
                      <Spinner /> Un momento...
                    </>
                  ) : mode === "login" ? (
                    "Entrar"
                  ) : (
                    "Crear cuenta"
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
                  {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
                </button>
              </div>
            </form>

            <GoogleSignIn onCredential={onGoogleCredential} />
          </>
        ) : (
          <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} noValidate>
            {view.notice && <p className={styles.tagline}>{view.notice}</p>}
            <div className="field">
              <label htmlFor="confirm-code">Código de confirmación</label>
              <input
                id="confirm-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                {...confirmForm.register("code", {
                  required: true,
                  validate: (v) => /^\d{6}$/.test(v.trim()) || "El código tiene 6 dígitos.",
                })}
              />
              {confirmForm.formState.errors.code && (
                <p className={styles.fieldError}>{confirmForm.formState.errors.code.message || "El código tiene 6 dígitos."}</p>
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
                    <Spinner /> Confirmando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </button>
              <button type="button" className={styles.toggleMode} onClick={onResend} disabled={resending}>
                Reenviar código
              </button>
              <button type="button" className={styles.toggleMode} onClick={backToLogin}>
                Volver a iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
