import { Link } from "react-router-dom";
import styles from "./Brand.module.css";

interface BrandProps {
  /** Tamaño base en px: todo el lockup se dimensiona en `em` contra este valor (css/style.css, mismo mecanismo que el hero del login usaba con .login-brand). */
  size?: number;
}

/** Marca RouteEV: icono + wordmark, portada de .brand-lockup (css/style.css). */
export function Brand({ size = 16 }: BrandProps) {
  return (
    <Link to="/" className={styles.lockup} style={{ fontSize: size }}>
      <img src="/img/logo-mark.png" className={styles.icon} alt="" />
      <span className={styles.word}>Route</span>
      <span className={styles.ai}>EV</span>
    </Link>
  );
}
