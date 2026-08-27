import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { Brand } from "./Brand";
import styles from "./SiteFooter.module.css";

interface SiteFooterProps {
  note?: string;
}

/** Footer compartido por landing, showroom y las páginas legales (css/landing.css .l-footer). */
export function SiteFooter({ note }: SiteFooterProps) {
  const { t } = useTranslation();
  const location = useLocation();
  // Mismo criterio que SiteHeader (isActiveLink): "Showroom" en /showroom
  // se veía igual que "Privacidad"/"Términos" -- ninguno de los links
  // marcaba en cuál de las páginas ya estabas. "Escribinos" (mailto:) queda
  // afuera a propósito: no es una ruta, nunca puede estar "activa".
  const isActiveLink = (href: string) => location.pathname === href;

  return (
    <footer className={styles.footer}>
      <div className={styles.brandCol}>
        {/* Antes el footer era puro texto gris, sin nada que lo atara
            visualmente al resto del sitio -- el mismo lockup ícono+wordmark
            del header, más chico, ancla que seguís en RouteEV incluso acá
            abajo del todo. */}
        <Brand size={14} />
        <span>{note ?? t.shared.siteFooter.defaultNote}</span>
      </div>
      <nav className={styles.links}>
        <Link
          to="/showroom"
          className={isActiveLink("/showroom") ? styles.linkActive : undefined}
          aria-current={isActiveLink("/showroom") ? "page" : undefined}
        >
          {t.shared.siteFooter.showroom}
        </Link>
        <Link
          to="/privacidad"
          className={isActiveLink("/privacidad") ? styles.linkActive : undefined}
          aria-current={isActiveLink("/privacidad") ? "page" : undefined}
        >
          {t.shared.siteFooter.privacy}
        </Link>
        <Link
          to="/terminos"
          className={isActiveLink("/terminos") ? styles.linkActive : undefined}
          aria-current={isActiveLink("/terminos") ? "page" : undefined}
        >
          {t.shared.siteFooter.terms}
        </Link>
        <a href="mailto:routemindtbo@gmail.com">{t.shared.siteFooter.contact}</a>
      </nav>
    </footer>
  );
}
