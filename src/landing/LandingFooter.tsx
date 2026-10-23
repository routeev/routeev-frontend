import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconInstagram } from "./landingIcons";
import styles from "./LandingFooter.module.css";

export const CONTACT_EMAIL = "contacto@routeev.uy";

interface LandingFooterProps {
  /** Cada página linkea a las otras, no a sí misma. */
  page?: "landing" | "showroom" | "legal";
  /** Una línea chica debajo (de dónde salen los datos, las fotos). */
  note?: string;
}

/** Pie de las páginas públicas (landing, showroom, legales). Lee --content-w de la página. */
export function LandingFooter({ page = "landing", note }: LandingFooterProps) {
  const { t } = useTranslation();
  const f = t.shared.siteFooter;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.row}>
          <div className={styles.brand}>
            <Link to="/" className={styles.logo} aria-label="RouteEV">
              <img src="/apple-touch-icon.png" alt="" width={24} height={24} />
              <span>
                Route<span className={styles.accent}>EV</span>
              </span>
            </Link>
            <span className={styles.copy}>© {new Date().getFullYear()}</span>
          </div>
          <nav aria-label={t.landing.footer.ariaLabel} className={styles.nav}>
            {page !== "landing" && <Link to="/">{t.landing.nav.home}</Link>}
            {page !== "showroom" && <Link to="/showroom">{f.showroom}</Link>}
            <Link to="/privacidad">{f.privacy}</Link>
            <Link to="/terminos">{f.terms}</Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>{f.contact}</a>
            <a
              href="https://www.instagram.com/routeev.uy/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={f.instagram}
              className={styles.social}
            >
              <IconInstagram />
            </a>
          </nav>
        </div>
        {note && <p className={styles.note}>{note}</p>}
      </div>
    </footer>
  );
}
