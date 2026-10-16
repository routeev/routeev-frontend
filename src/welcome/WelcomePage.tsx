import { useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { useModal } from "../shared/useModal";
import { PhoneMockup } from "./PhoneMockup";
import { APP_STORE_URL, BADGES, GOOGLE_PLAY_URL, STORE_QR_SRC, detectMobileOs } from "./stores";
import { NATIONAL_ROADS, URUGUAY_OUTLINE, toSvgPoints } from "./uruguayMap";
import styles from "./WelcomePage.module.css";

// La textura de fondo usa una tesela de origen corrida una columna respecto
// del mockup (42 y no 43): queda más grande y desplazada, que es lo buscado.
const TEXTURE_OUTLINE = toSvgPoints(URUGUAY_OUTLINE, 42, 74);
const TEXTURE_ROADS = NATIONAL_ROADS.map((road) => toSvgPoints(road, 42, 74));

function subscribeToResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getViewportHeight(): number {
  return window.innerHeight;
}

/**
 * Escala del teléfono en desktop: llena el alto que dejan libre el header, el
 * footer y el aire (200px), entre 0.55 y 1.05 de su tamaño base de 652px. En
 * JS y no en CSS porque calc() no puede dividir un largo por otro para dar el
 * número que pide scale(). En mobile la escala es fija y la pone el CSS.
 */
function desktopPhoneScale(viewportHeight: number): number {
  return Math.min(1.05, Math.max(0.55, (viewportHeight - 200) / 652));
}

const LEAVE_MS = 200;

interface WelcomePageProps {
  /**
   * Con esto la bienvenida no es una página sino una capa encima de la home
   * (LandingPage), y la home ya está atrás: el logo, "Ir a la web", "Seguir
   * en la web" y Escape la cierran y después llaman a esto.
   */
  onContinue?: () => void;
}

/**
 * Pantalla intermedia antes de entrar a la web: invita a bajar la app y deja
 * seguir en la web. Una sola vista, sin scroll en ningún tamaño (ver el
 * .module.css). Siempre oscura, como el resto de las páginas públicas.
 */
export function WelcomePage({ onContinue }: WelcomePageProps) {
  return onContinue ? <WelcomeOverlay onContinue={onContinue} /> : <Welcome />;
}

function WelcomeOverlay({ onContinue }: { onContinue: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  // Se va con un fundido y recién ahí se desmonta: la home aparece de a poco.
  function close() {
    if (leaving) return;
    setLeaving(true);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onContinue, reduce ? 0 : LEAVE_MS);
  }

  // El foco arranca en la capa entera (no en un botón, que se vería marcado
  // apenas carga la página) y la home de atrás no scrollea.
  useModal(dialogRef, close, dialogRef);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bienvenida-titulo"
      tabIndex={-1}
      className={[styles.overlay, leaving ? styles.leaving : ""].join(" ")}
    >
      <Welcome onContinue={close} />
    </div>
  );
}

function Welcome({ onContinue }: WelcomePageProps) {
  const { t, lang } = useTranslation();
  const w = t.welcome;
  const viewportHeight = useSyncExternalStore(subscribeToResize, getViewportHeight, () => 900);
  const os = detectMobileOs(navigator.userAgent);
  const badges = BADGES[lang];

  // Los dos badges siempre, en todos los tamaños. En mobile la tienda del
  // sistema va primero (en Android, Google Play); en desktop el orden es fijo
  // y además está el QR.
  const storesClass = [styles.stores, os === "android" ? styles.storesPlayFirst : ""].join(" ");

  const rootStyle = { "--ps-fit": desktopPhoneScale(viewportHeight).toFixed(3) } as CSSProperties;

  // En la capa, ir a la web es cerrarla.
  const toWeb = onContinue
    ? (e: MouseEvent) => {
        e.preventDefault();
        onContinue();
      }
    : undefined;

  return (
    <div className={styles.page} style={rootStyle}>
      {/* En la capa no: el título y el noindex serían los de la home. */}
      {!onContinue && (
        <Helmet>
          <title>{w.meta.title}</title>
          <meta name="description" content={w.meta.description} />
          {/* A propósito: es una pantalla de paso con el mismo título que la
              home. En los resultados de búsqueda tiene que aparecer la home. */}
          <meta name="robots" content="noindex" />
        </Helmet>
      )}

      <div className={styles.texture} aria-hidden="true">
        <div className={styles.textureMap}>
          <svg width="1024" height="1024" viewBox="0 0 1024 1024">
            <polygon points={TEXTURE_OUTLINE} className={styles.textureCountry} />
            {TEXTURE_ROADS.map((points) => (
              <polyline key={points} points={points} className={styles.textureRoad} />
            ))}
          </svg>
        </div>
      </div>

      <div className={styles.layout}>
        <header className={styles.header}>
          <Link to="/" className={styles.logo} aria-label="RouteEV" onClick={toWeb}>
            <img src="/apple-touch-icon.png" alt="" width={32} height={32} />
            <span>
              Route<span className={styles.accent}>EV</span>
            </span>
          </Link>
          <Link to="/" className={[styles.goToWeb, styles.desktopOnly].join(" ")} onClick={toWeb}>
            {w.goToWeb} <span aria-hidden="true">→</span>
          </Link>
        </header>

        <main className={styles.main}>
          <div className={styles.content}>
            <p className={[styles.newBadge, styles.desktopOnly].join(" ")}>
              <span className={styles.newDot} aria-hidden="true" />
              <span>
                <span className={styles.accent}>{w.newBadge.label}</span> · {w.newBadge.text}
              </span>
            </p>

            <h1 id="bienvenida-titulo" className={styles.title}>
              {w.title.lead} <span className={styles.accent}>{w.title.accent}</span>
            </h1>
            <p className={styles.subtitle}>{w.subtitle}</p>

            <div className={storesClass}>
              <a href={APP_STORE_URL} className={styles.storeBadge}>
                <img {...badges.appStore} alt={w.stores.appStoreAlt} />
              </a>
              <a href={GOOGLE_PLAY_URL} className={[styles.storeBadge, styles.playBadge].join(" ")}>
                <img {...badges.googlePlay} alt={w.stores.googlePlayAlt} />
              </a>
              <div className={[styles.qrBlock, styles.desktopOnly].join(" ")}>
                <div className={styles.qr}>
                  <img src={STORE_QR_SRC} alt={w.stores.qrAlt} width={29} height={29} />
                </div>
                <span className={styles.qrHint}>{w.stores.scanToDownload}</span>
              </div>
            </div>

            <Link to="/" className={styles.continue} onClick={toWeb}>
              {w.continueOnWeb} <span aria-hidden="true">→</span>
            </Link>

            <p className={[styles.miniFooter, styles.mobileOnly].join(" ")}>
              <span>{w.footerNote}</span>
              <span aria-hidden="true">·</span>
              <Link to="/privacidad">{t.shared.siteFooter.privacy}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/terminos">{t.shared.siteFooter.terms}</Link>
            </p>
          </div>

          <div className={styles.phoneStage} aria-hidden="true">
            <div className={styles.glow} />
            <div className={styles.phoneBox}>
              <div className={styles.phoneScaler}>
                <PhoneMockup />
              </div>
              <div className={[styles.chip, styles.chipModels].join(" ")}>
                <span className={styles.chipValue}>328</span>
                <span className={styles.chipLabel}>{w.chips.models}</span>
              </div>
              <div className={[styles.chip, styles.chipStations].join(" ")}>
                <span className={styles.chipDot} />
                <span className={styles.chipValue}>261</span>
                <span className={styles.chipLabel}>{w.chips.stations}</span>
              </div>
            </div>
          </div>
        </main>

        <footer className={[styles.footer, styles.desktopOnly].join(" ")}>
          <span>{w.footerNote}</span>
          <nav className={styles.footerLinks}>
            <Link to="/privacidad">{t.shared.siteFooter.privacy}</Link>
            <Link to="/terminos">{t.shared.siteFooter.terms}</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
