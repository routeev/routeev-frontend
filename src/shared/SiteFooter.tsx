import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { Brand } from "./Brand";
import { IconInstagram } from "./NavIcons";
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
            abajo del todo. Apilado (logo arriba, nota abajo) en vez de una
            sola línea corrida: se lee como el bloque de marca del footer, no
            como un dato más al lado de los links. La nota es el copyright
            por default -- Showroom sigue pisándolo con su propio disclaimer
            de datos (`note`), que no tiene nada que ver con esto. */}
        <Brand size={14} />
        <span className={styles.note}>{note ?? t.shared.siteFooter.copyright(new Date().getFullYear())}</span>
      </div>
      <div className={styles.right}>
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
        {/* Único link externo/social: badge circular aparte de la nav de
            texto, no un link más de la lista -- es el patrón de siempre para
            "ícono social en el footer" (LinkedIn, X, etc.), y separa "página
            de tu sitio" de "perfil en otra red" de un vistazo, sin depender
            del color para notarlo. */}
        <a
          href="https://www.instagram.com/routeev.uy/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.social}
          aria-label={t.shared.siteFooter.instagram}
          title={t.shared.siteFooter.instagram}
        >
          <IconInstagram />
        </a>
      </div>
    </footer>
  );
}
