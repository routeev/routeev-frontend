import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getUsername } from "../api/session";
import { Brand } from "./Brand";
import { IconLogout } from "./NavIcons";
import styles from "./AppTopbar.module.css";

interface AppTopbarProps {
  /** Texto al lado de la marca ("Mi perfil"); la pantalla del mapa no lleva. */
  subtitle?: string;
  /** Enlaces propios de la pantalla (volver al mapa, ir al perfil). */
  children?: ReactNode;
  /** Nombre a mostrar en el chip; por defecto, el de la sesión. */
  username?: string;
}

/**
 * Barra superior de las pantallas con cuenta (/app y /profile), portada de
 * css/app.css. Debajo de 860px .right se esconde detrás de un botón
 * hamburguesa (mismo patrón que SiteHeader): el chip de usuario, "Cerrar
 * sesión" y el link propio de cada pantalla (Mi perfil / Volver al mapa)
 * pasan a un panel desplegable en vez de competir con la marca en la barra.
 */
export function AppTopbar({ subtitle, children, username }: AppTopbarProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function logout() {
    clearSession();
    navigate("/");
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <Brand />
        {subtitle && <span className={styles.brandSub}>{subtitle}</span>}
      </div>
      <div className={styles.right}>
        {children}
        <span className={styles.userChip}>{username ?? getUsername() ?? "usuario"}</span>
        <button type="button" className="ghost" onClick={logout}>
          <IconLogout />
          Cerrar sesión
        </button>
      </div>
      <button
        type="button"
        className={styles.menuToggle}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={open ? styles.menuIconOpen : styles.menuIcon} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileMenuLink} onClick={() => setOpen(false)}>
            {children}
          </div>
          <button type="button" className="ghost" onClick={logout}>
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
