import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
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
import { useTranslation, type Lang } from "../i18n/LanguageProvider";
import { IconInstagram } from "../landing/landingIcons";
import { LoginNight, WitchHat } from "../season/HalloweenDecor";
import { SeasonChip } from "../season/SeasonChip";
import { GraphBackground } from "../shared/GraphBackground";
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconCircle,
  IconClock,
  IconEye,
  IconEyeOff,
  IconInfo,
  IconMail,
  IconResend,
} from "./authIcons";
import { GoogleSignIn } from "./GoogleSignIn";
import styles from "./LoginPage.module.css";

/**
 * Los dos primeros pasos salen de la URL (`/login` y `/login?crear=1`, que ya
 * están linkeados en todo el sitio); los intermedios no la cambian y al
 * recargar se vuelve al login.
 */
type Flow =
  | null
  | { step: "confirm"; email: string }
  | { step: "forgot" }
  // Código mandado, todavía sin validar contra el backend.
  | { step: "code"; email: string }
  // Código ya validado: recién acá se pide la contraseña nueva, para no
  // hacerla escribir dos veces solo para enterarse al final de que el código
  // estaba mal tipeado.
  | { step: "newpass"; email: string; code: string };

type Step = "login" | "signup" | "confirm" | "forgot" | "code" | "newpass";
type FieldKey = "email" | "name" | "pass" | "pass2" | "code";
type Values = Record<FieldKey, string>;
type Errors = Partial<Record<FieldKey, string>>;
type Notice = { tone: "error" | "info" | "ok"; text: string } | null;

const FIELDS: Record<Step, FieldKey[]> = {
  login: ["email", "pass"],
  // Nombre antes que la contraseña: así el requisito de los 10 caracteres
  // queda pegado al botón.
  signup: ["email", "name", "pass"],
  confirm: ["code"],
  forgot: ["email"],
  code: ["code"],
  newpass: ["pass", "pass2"],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;
// La API a veces tarda cerca de un minuto en despertar: pasado esto, se avisa.
const SLOW_AFTER_MS = 6000;

const LANGS: { code: Lang; short: string; name: string }[] = [
  { code: "es", short: "ES", name: "Español" },
  { code: "en", short: "EN", name: "English" },
];

const EMPTY: Values = { email: "", name: "", pass: "", pass2: "", code: "" };

export function LoginPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();
  const a = t.auth;
  const [searchParams, setSearchParams] = useSearchParams();
  const signupUrl = searchParams.get("crear") === "1";
  const [flow, setFlow] = useState<Flow>(null);
  const step: Step = flow?.step ?? (signupUrl ? "signup" : "login");

  const [vals, setVals] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [shown, setShown] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [run, setRun] = useState({ id: 0, sending: false, slow: false });
  const [resending, setResending] = useState(false);
  const runCounter = useRef(0);
  const headRef = useRef<HTMLHeadingElement>(null);
  const focusHead = useRef(false);
  const uid = useId();
  const fieldId = (k: FieldKey) => `${uid}-${k}`;

  // Cada cambio de paso lleva el foco al título: el lector de pantalla
  // anuncia dónde está, y el teclado sigue desde arriba de la tarjeta.
  useEffect(() => {
    if (!focusHead.current) return;
    focusHead.current = false;
    headRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Con el teclado del celular abierto, que el contenido se achique en vez
  // de quedar tapado: el botón principal tiene que poder verse. Solo en esta
  // pantalla, para no cambiar cómo se comporta el mapa de /app.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const previous = meta?.getAttribute("content");
    if (!meta || previous == null || previous.includes("interactive-widget")) return;
    meta.setAttribute("content", `${previous}, interactive-widget=resizes-content`);
    return () => meta.setAttribute("content", previous);
  }, []);

  function go(next: Flow) {
    focusHead.current = true;
    setFlow(next);
    setErrors({});
    setNotice(null);
    setShown({});
    setVals((v) => ({ ...v, code: "", pass: next?.step === "newpass" ? "" : v.pass, pass2: "" }));
  }

  function backToLogin() {
    if (signupUrl) setSearchParams({}, { replace: true });
    go(null);
  }

  function goToApp(session: { access_token: string; username: string }) {
    setSession(session.access_token, session.username);
    navigate("/app", { replace: true });
  }

  function setValue(k: FieldKey, value: string) {
    // El código queda solo con dígitos: pegar "482 913" o "Código: 482913"
    // deja "482913".
    const v = k === "code" ? value.replace(/\D/g, "").slice(0, 6) : value;
    setVals((prev) => ({ ...prev, [k]: v }));
    // Escribir en un campo borra su error: el aviso se va al corregirlo.
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  }

  function validate(): Errors {
    const e: Errors = {};
    const fields = FIELDS[step];
    if (fields.includes("email") && !EMAIL_RE.test(vals.email.trim())) e.email = a.errors.email;
    if (fields.includes("pass")) {
      if (step === "login") {
        if (!vals.pass) e.pass = a.errors.passwordEmpty;
      } else if (vals.pass.length < MIN_PASSWORD) {
        e.pass = a.errors.passwordShort;
      }
    }
    if (fields.includes("pass2") && !e.pass && vals.pass2 !== vals.pass)
      e.pass2 = a.errors.mismatch;
    if (fields.includes("code") && !/^\d{6}$/.test(vals.code)) e.code = a.errors.code;
    return e;
  }

  /** Corre un envío con el botón en "enviando" y, si tarda, el aviso de la API despertando. */
  async function track(task: () => Promise<void>) {
    const id = ++runCounter.current;
    setRun({ id, sending: true, slow: false });
    const timer = window.setTimeout(
      () => setRun((r) => (r.id === id && r.sending ? { ...r, slow: true } : r)),
      SLOW_AFTER_MS
    );
    try {
      await task();
    } finally {
      window.clearTimeout(timer);
      setRun((r) => (r.id === id ? { ...r, sending: false, slow: false } : r));
    }
  }

  const failWith = (err: unknown, fallback: string) =>
    setNotice({ tone: "error", text: err instanceof Error ? err.message : fallback });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (run.sending) return;
    const found = validate();
    setErrors(found);
    setNotice(null);
    const first = FIELDS[step].find((k) => found[k]);
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }
    const email = vals.email.trim();

    await track(async () => {
      switch (step) {
        case "login":
          try {
            const result = await login(email, vals.pass);
            if (result.confirmation_required) go({ step: "confirm", email: result.email });
            else goToApp(result);
          } catch (err) {
            if (err instanceof ApiError && err.status === 403) {
              // Credenciales correctas pero el correo sin confirmar: en vez de
              // dejarlo sin salida, al paso de confirmación con la opción de
              // reenviar el código.
              go({ step: "confirm", email });
              setNotice({ tone: "info", text: a.notices.unconfirmed });
            } else {
              failWith(err, a.errors.generic);
            }
          }
          break;
        case "signup":
          try {
            // El nombre vacío se manda como si el campo no existiera (ver
            // register()): nunca frena el alta.
            const result = await register(email, vals.pass, vals.name);
            if (result.confirmation_required) go({ step: "confirm", email: result.email });
            else goToApp(result);
          } catch (err) {
            failWith(err, a.errors.generic);
          }
          break;
        case "confirm":
          if (flow?.step !== "confirm") return;
          try {
            goToApp(await confirmEmail(flow.email, vals.code));
          } catch (err) {
            failWith(err, a.errors.confirm);
          }
          break;
        case "forgot":
          try {
            // Avanza exista o no la cuenta: el backend responde igual en los
            // dos casos a propósito (anti-enumeración). El error real (red
            // caída, límite de pedidos) sí se muestra y no avanza.
            await requestPasswordReset(email);
            go({ step: "code", email });
          } catch (err) {
            failWith(err, a.errors.forgot);
          }
          break;
        case "code":
          if (flow?.step !== "code") return;
          try {
            // Solo lectura: confirma que vale la pena pedir la contraseña
            // nueva, sin consumir el código.
            await verifyPasswordResetCode(flow.email, vals.code);
            go({ step: "newpass", email: flow.email, code: vals.code });
          } catch (err) {
            failWith(err, a.errors.verify);
          }
          break;
        case "newpass":
          if (flow?.step !== "newpass") return;
          try {
            // El backend revalida el código igual, por si venció justo en el medio.
            goToApp(await resetPassword(flow.email, flow.code, vals.pass));
          } catch (err) {
            failWith(err, a.errors.reset);
          }
          break;
      }
    });
  }

  async function onResend() {
    if (!flow || flow.step === "forgot") return;
    setResending(true);
    setNotice(null);
    try {
      if (flow.step === "confirm") {
        await resendConfirmation(flow.email);
      } else {
        await requestPasswordReset(flow.email);
        // Un código nuevo anula el anterior, aunque ya estuviera validado:
        // hay que volver a pedirlo.
        if (flow.step === "newpass") go({ step: "code", email: flow.email });
      }
      setVals((v) => ({ ...v, code: "" }));
      setNotice({ tone: "ok", text: a.notices.resent });
    } catch (err) {
      failWith(err, a.errors.resend);
    } finally {
      setResending(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    setNotice(null);
    try {
      goToApp(await googleLogin(credential));
    } catch (err) {
      failWith(err, a.errors.google);
    }
  }

  const texts = a.steps[step];
  const isAuth = step === "login" || step === "signup";
  const flowEmail = flow && "email" in flow ? flow.email : "";

  function passwordMessage(k: FieldKey): Message | null {
    if (errors[k]) return { tone: "error", text: errors[k]! };
    if (k !== "pass" || step === "login") return null;
    const missing = MIN_PASSWORD - vals.pass.length;
    if (!vals.pass) return { tone: "rule", text: a.passwordRule.empty };
    if (missing > 0) return { tone: "rule", text: a.passwordRule.missing(missing) };
    return { tone: "ok", text: a.passwordRule.ok };
  }

  function renderField(k: FieldKey) {
    const common = {
      id: fieldId(k),
      value: vals[k],
      onChange: (v: string) => setValue(k, v),
      error: Boolean(errors[k]),
    };
    switch (k) {
      case "email":
        return (
          <Field
            key={k}
            {...common}
            label={a.fields.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={a.fields.emailPlaceholder}
            message={errors.email ? { tone: "error", text: errors.email } : null}
          />
        );
      case "name":
        return (
          <Field
            key={k}
            {...common}
            label={a.fields.name}
            optional={a.fields.optional}
            type="text"
            autoComplete="nickname"
            maxLength={32}
            placeholder={a.fields.namePlaceholder}
            message={{ tone: "hint", text: a.fields.nameHint }}
          />
        );
      case "pass":
      case "pass2":
        return (
          <Field
            key={k}
            {...common}
            label={
              k === "pass2"
                ? a.fields.repeatPassword
                : step === "newpass"
                  ? a.fields.newPassword
                  : a.fields.password
            }
            type={shown[k] ? "text" : "password"}
            autoComplete={step === "login" ? "current-password" : "new-password"}
            message={passwordMessage(k)}
            eye={{
              shown: Boolean(shown[k]),
              toggle: () => setShown((s) => ({ ...s, [k]: !s[k] })),
              show: a.fields.showPassword,
              hide: a.fields.hidePassword,
            }}
          />
        );
      case "code":
        return (
          <Field
            key={k}
            {...common}
            code
            label={a.fields.code}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            message={errors.code ? { tone: "error", text: errors.code } : null}
          />
        );
    }
  }

  const subtitle: ReactNode =
    "subtitle" in texts ? (
      texts.subtitle
    ) : "before" in texts ? (
      <>
        {texts.before}
        <strong>{flowEmail}</strong>
        {texts.after}
      </>
    ) : null;

  return (
    <div className={styles.page} lang={lang}>
      <Helmet>
        <title>{signupUrl ? a.meta.titleSignup : a.meta.titleLogin}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className={styles.bgWrap} aria-hidden="true">
        <LoginNight />
        <GraphBackground />
      </div>
      <div className={styles.veil} aria-hidden="true" />

      <header className={styles.header}>
        <Link to="/" className={styles.logo} aria-label={a.header.logoLabel}>
          <WitchHat />
          <img src="/apple-touch-icon.png" alt="" width={30} height={30} />
          <span>
            Route<span className={styles.accent}>EV</span>
          </span>
        </Link>
        <div className={styles.headerEnd}>
          <SeasonChip />
          <Link to="/" className={styles.homeLink}>
            <IconArrowLeft />
            <span className={styles.homeLong}>{a.header.backHome}</span>
            <span className={styles.homeShort}>{a.header.backHomeShort}</span>
          </Link>
          <div role="group" aria-label={a.header.language} className={styles.langSeg}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                lang={l.code}
                aria-pressed={lang === l.code}
                aria-label={l.name}
                onClick={() => setLang(l.code)}
              >
                {l.short}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          {isAuth ? (
            <nav aria-label={a.mode.label} className={styles.seg}>
              <Link
                to="/login"
                replace
                preventScrollReset
                className={styles.segItem}
                aria-current={step === "login" ? "page" : undefined}
                onClick={() => step !== "login" && go(null)}
              >
                {a.mode.login}
              </Link>
              <Link
                to="/login?crear=1"
                replace
                preventScrollReset
                className={styles.segItem}
                aria-current={step === "signup" ? "page" : undefined}
                onClick={() => step !== "signup" && go(null)}
              >
                {a.mode.signup}
              </Link>
            </nav>
          ) : (
            <button type="button" className={styles.back} onClick={backToLogin}>
              <IconChevronLeft />
              {a.backToLogin}
            </button>
          )}

          <div className={styles.stepHead}>
            {"eyebrow" in texts && (
              <p className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                {texts.eyebrow}
              </p>
            )}
            <h1 ref={headRef} tabIndex={-1} className={styles.title}>
              {texts.title}
            </h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          <form className={styles.form} onSubmit={onSubmit} noValidate aria-busy={run.sending}>
            {notice?.tone === "error" && (
              <div role="alert" className={`${styles.notice} ${styles.noticeError}`}>
                <IconAlert />
                <span>{notice.text}</span>
              </div>
            )}
            {/* Montado siempre y vacío cuando no hay nada: los lectores de
                pantalla anuncian mejor un cambio de contenido que un nodo nuevo. */}
            <div role="status" className={styles.status}>
              {notice && notice.tone !== "error" && (
                <div
                  className={`${styles.notice} ${notice.tone === "ok" ? styles.noticeOk : styles.noticeInfo}`}
                >
                  {notice.tone === "ok" ? <IconMail /> : <IconInfo />}
                  <span>{notice.text}</span>
                </div>
              )}
            </div>

            {FIELDS[step].map(renderField)}

            {step === "login" && (
              <div className={styles.forgotRow}>
                <button
                  type="button"
                  className={styles.forgot}
                  onClick={() => go({ step: "forgot" })}
                >
                  {a.forgotLink}
                </button>
              </div>
            )}

            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={run.sending}>
                {run.sending && <span className={styles.spinner} aria-hidden="true" />}
                <span>{run.sending ? texts.busy : texts.submit}</span>
              </button>
              <div aria-live="polite" className={styles.status}>
                {run.slow && (
                  <p className={styles.slow}>
                    <IconClock />
                    {a.slow}
                  </p>
                )}
              </div>
            </div>

            {(step === "confirm" || step === "code" || step === "newpass") && (
              <button
                type="button"
                className={styles.secondary}
                onClick={onResend}
                disabled={run.sending || resending}
              >
                <IconResend />
                {step === "newpass" ? a.newCode : a.resend}
              </button>
            )}

            {step === "signup" && (
              <p className={styles.terms}>
                {a.terms.before}
                <Link to="/terminos">{a.terms.terms}</Link>
                {a.terms.middle}
                <Link to="/privacidad">{a.terms.privacy}</Link>
                {a.terms.after}
              </p>
            )}
          </form>

          {isAuth && <GoogleSignIn onCredential={onGoogleCredential} signup={step === "signup"} />}
        </div>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} RouteEV</span>
          <Link to="/privacidad">{a.footer.privacy}</Link>
          <Link to="/terminos">{a.footer.terms}</Link>
          <a
            href="https://instagram.com/routeev.uy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className={styles.footerIcon}
          >
            <IconInstagram size={18} />
          </a>
        </footer>
      </main>
    </div>
  );
}

type Message = { tone: "error" | "rule" | "ok" | "hint"; text: string };

interface FieldProps {
  id: string;
  label: string;
  optional?: string;
  value: string;
  onChange: (value: string) => void;
  error: boolean;
  message: Message | null;
  type: "email" | "text" | "password";
  inputMode?: "email" | "numeric";
  autoComplete: string;
  placeholder?: string;
  maxLength?: number;
  code?: boolean;
  eye?: { shown: boolean; toggle: () => void; show: string; hide: string };
}

/** Label visible arriba, el campo, y debajo su mensaje (error, requisito o aclaración). */
function Field({
  id,
  label,
  optional,
  value,
  onChange,
  error,
  message,
  type,
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  code = false,
  eye,
}: FieldProps) {
  const msgId = message ? `${id}-msg` : undefined;
  const inputClass = [styles.input, code ? styles.inputCode : "", eye ? styles.inputPassword : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> {optional}</span>}
      </label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={inputClass}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error || undefined}
          aria-describedby={msgId}
        />
        {eye && (
          <button
            type="button"
            className={styles.eye}
            onClick={eye.toggle}
            aria-label={eye.shown ? eye.hide : eye.show}
            aria-pressed={eye.shown}
            aria-controls={id}
          >
            {eye.shown ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
      </div>
      {message && (
        <p
          id={msgId}
          className={[
            styles.msg,
            message.tone === "error" ? styles.msgError : message.tone === "ok" ? styles.msgOk : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {message.tone === "error" && <IconAlert size={16} />}
          {message.tone === "ok" && <IconCheck />}
          {message.tone === "rule" && <IconCircle />}
          <span>{message.text}</span>
        </p>
      )}
    </div>
  );
}
