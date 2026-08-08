import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getUsername } from "../api/session";
import { Brand } from "./Brand";
import styles from "./AppTopbar.module.css";

interface AppTopbarProps {
  /** Texto al lado de la marca ("Mi perfil"); la pantalla del mapa no lleva. */
  subtitle?: string;
  /** Enlaces propios de la pantalla (volver al mapa, ir al perfil). */
  children?: ReactNode;
  /** Nombre a mostrar en el chip; por defecto, el de la sesión. */
  username?: string;
}

/** Barra superior de las pantallas con cuenta (/app y /profile), portada de css/app.css. */
export function AppTopbar({ subtitle, children, username }: AppTopbarProps) {
  const navigate = useNavigate();

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <Brand />
        {subtitle && <span className={styles.brandSub}>{subtitle}</span>}
      </div>
      <div className={styles.right}>
        {children}
        <span className={styles.userChip}>{username ?? getUsername() ?? "usuario"}</span>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            clearSession();
            navigate("/");
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
