import { Link } from "react-router-dom";
import styles from "./SiteFooter.module.css";

interface SiteFooterProps {
  note?: string;
}

/** Footer compartido por landing, showroom y las páginas legales (css/landing.css .l-footer). */
export function SiteFooter({ note = "RouteEV — hecho en Montevideo, Uruguay." }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <span>{note}</span>
      <div className={styles.links}>
        <Link to="/showroom">Showroom</Link>
        <Link to="/privacidad">Privacidad</Link>
        <Link to="/terminos">Términos</Link>
        <a href="mailto:routemindtbo@gmail.com">Escribinos</a>
      </div>
    </footer>
  );
}
