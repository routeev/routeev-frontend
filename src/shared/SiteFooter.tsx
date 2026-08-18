import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./SiteFooter.module.css";

interface SiteFooterProps {
  note?: string;
}

/** Footer compartido por landing, showroom y las páginas legales (css/landing.css .l-footer). */
export function SiteFooter({ note }: SiteFooterProps) {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <span>{note ?? t.shared.siteFooter.defaultNote}</span>
      <div className={styles.links}>
        <Link to="/showroom">{t.shared.siteFooter.showroom}</Link>
        <Link to="/privacidad">{t.shared.siteFooter.privacy}</Link>
        <Link to="/terminos">{t.shared.siteFooter.terms}</Link>
        <a href="mailto:routemindtbo@gmail.com">{t.shared.siteFooter.contact}</a>
      </div>
    </footer>
  );
}
