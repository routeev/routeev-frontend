import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/user";
import { clearSession, getUsername } from "../api/session";
import { Brand } from "./Brand";
import { cloudinaryResize } from "./cloudinaryResize";
import { IconLogout, IconUser } from "./NavIcons";
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
 * hamburguesa (mismo patrón que SiteHeader): el link propio de cada pantalla
 * (Mi perfil / Volver al mapa) y "Cerrar sesión" pasan a un panel desplegable
 * en vez de competir con la marca en la barra.
 */
export function AppTopbar({ subtitle, children, username }: AppTopbarProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Misma queryKey que AccountPanel/ProfilePage ("me"): si esa pantalla ya
  // la pidió, esto sale del cache de TanStack Query sin otro fetch -- en
  // /app (que no la pide en ningun otro lado) dispara la suya propia, una
  // sola vez por sesion de pestaña.
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });

  function logout() {
    clearSession();
    navigate("/");
  }

  const displayName = meQuery.data?.username ?? username ?? getUsername() ?? "usuario";
  const photoUrl = meQuery.data?.photo_url;

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <Brand />
        {subtitle && <span className={styles.brandSub}>{subtitle}</span>}
      </div>
      <div className={styles.right}>
        {children}
        <div className={styles.userMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.userMenuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {photoUrl ? (
              <img src={cloudinaryResize(photoUrl, 64)} className={styles.userMenuAvatar} alt="" />
            ) : (
              <span className={styles.userMenuAvatarFallback} aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className={styles.userMenuName}>{displayName}</span>
          </button>
          {menuOpen && (
            <div className={styles.userMenuDropdown} role="menu">
              <Link
                to="/profile"
                className={styles.userMenuItem}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <IconUser />
                Ir a mi perfil
              </Link>
              <button
                type="button"
                className={styles.userMenuItem}
                role="menuitem"
                onClick={logout}
              >
                <IconLogout />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
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
