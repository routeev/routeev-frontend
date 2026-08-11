import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { IconCar, IconChart, IconInfo } from "./NavIcons";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  navLinks?: { href: string; label: string }[];
  children?: ReactNode;
}

// Ícono por link del menú móvil, por href -- hoy solo la landing pasa
// navLinks (3 fijos), así que un mapa local alcanza sin sumar una prop de
// ícono por link a la interfaz pública del componente.
const NAV_ICONS: Record<string, ReactNode> = {
  "/showroom": <IconCar />,
  "#como-funciona": <IconInfo />,
  "#datos-reales": <IconChart />,
};

/**
 * Nav sticky compartido por landing y las páginas legales (css/landing.css .l-nav).
 *
 * Debajo de 900px .links se esconde (ver SiteHeader.module.css) -- sin esto, un
 * hamburguesa que nunca se muestra en desktop quedaria en el DOM sin motivo. El
 * menu solo existe si hay navLinks para mostrar (LegalLayout no pasa ninguno).
 */
export function SiteHeader({ navLinks, children }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const hasLinks = Boolean(navLinks && navLinks.length > 0);

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <Brand />
        {hasLinks && (
          <nav className={styles.links}>
            {navLinks!.map((link) =>
              link.href.startsWith("#") ? (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} to={link.href}>
                  {link.label}
                </Link>
              )
            )}
          </nav>
        )}
        <div className={styles.cta}>{children}</div>
        {hasLinks && (
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={open ? styles.menuIconOpen : styles.menuIcon} aria-hidden="true" />
          </button>
        )}
      </div>
      {hasLinks && open && (
        <nav className={styles.mobileMenu}>
          {navLinks!.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.href}
                href={link.href}
                className={styles.mobileLink}
                onClick={() => setOpen(false)}
              >
                {NAV_ICONS[link.href]}
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className={styles.mobileLink}
                onClick={() => setOpen(false)}
              >
                {NAV_ICONS[link.href]}
                {link.label}
              </Link>
            )
          )}
          {/* .cta se esconde en la barra en mobile (ver .hasMenu .cta en el
              CSS) -- se repite acá adentro para no perder "Iniciar sesión" /
              "Crear cuenta" del todo, solo movidos de lugar y separados con
              más aire para que no se lean como un link más de la lista. */}
          {children && (
            <div className={styles.mobileMenuActions} onClick={() => setOpen(false)}>
              {children}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
