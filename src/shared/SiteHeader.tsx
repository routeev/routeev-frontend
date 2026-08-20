import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { Brand } from "./Brand";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { IconCar, IconChart, IconGlobe, IconHome, IconInfo } from "./NavIcons";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  navLinks?: { href: string; label: string }[];
  children?: ReactNode;
}

// Ícono por link del menú móvil, por href -- landing, showroom y las
// páginas legales pasan un subconjunto fijo de estos, así que un mapa local
// alcanza sin sumar una prop de ícono por link a la interfaz pública del
// componente.
const NAV_ICONS: Record<string, ReactNode> = {
  "/": <IconHome />,
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
  const { t } = useTranslation();
  const location = useLocation();
  const hasLinks = Boolean(navLinks && navLinks.length > 0);

  // Solo links de pagina (no los anclas "#como-funciona" de la landing, que
  // no tienen una ruta propia contra la cual compararse): asi "Showroom" se
  // resalta cuando estas en /showroom, o "Inicio" en las paginas legales.
  const isActiveLink = (href: string) => !href.startsWith("#") && location.pathname === href;

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
                <Link
                  key={link.href}
                  to={link.href}
                  className={isActiveLink(link.href) ? styles.linkActive : undefined}
                  aria-current={isActiveLink(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        )}
        <div className={styles.actions}>
          {/* .languageSlot se esconde en mobile igual que .cta (ver
              ".inner:has(.menuToggle) .languageSlot" en el CSS) -- pedido
              explícito de que el selector de idioma viva ADENTRO del menú
              hamburguesa en mobile en vez de ocupar su propio lugar en la
              barra. El :has() (no un media query a secas) es lo que hace
              que, si algún día una pantalla usa SiteHeader sin navLinks (sin
              hamburguesa, ver el docblock del componente), esto siga visible
              acá -- sin eso quedaría sin ningún lugar donde mostrarse. Sin
              ThemeSwitcher a propósito: el modo claro/oscuro es solo para
              pantallas con cuenta (AppTopbar/AccountPanel) -- acá no va. */}
          <div className={styles.languageSlot}>
            <LanguageSwitcher />
          </div>
          <div className={styles.cta}>{children}</div>
          {hasLinks && (
            <button
              type="button"
              className={styles.menuToggle}
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className={open ? styles.menuIconOpen : styles.menuIcon} aria-hidden="true" />
            </button>
          )}
        </div>
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
                className={[styles.mobileLink, isActiveLink(link.href) ? styles.mobileLinkActive : ""].join(" ")}
                aria-current={isActiveLink(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {NAV_ICONS[link.href]}
                {link.label}
              </Link>
            )
          )}
          {/* Fila propia para el idioma, entre los links y las acciones de
              cuenta: en la barra de arriba está escondida en mobile (ver
              .languageSlot), así que este es su único lugar en pantalla
              angosta. No usa onClick={() => setOpen(false)} en el contenedor
              (a diferencia de los links y de .mobileMenuActions más abajo):
              elegir un idioma no tiene por qué cerrar el menú entero, es la
              propia LanguageSwitcher la que abre/cierra SU dropdown. */}
          <div className={styles.mobileMenuLanguage}>
            <span className={styles.mobileMenuLanguageLabel}>
              <IconGlobe />
              {t.common.languageSwitcherLabel}
            </span>
            <LanguageSwitcher />
          </div>
          {/* .cta se esconde en la barra en mobile (ver ".inner:has(.menuToggle)
              .cta" en el CSS) -- se repite acá adentro para no perder
              "Iniciar sesión" / "Crear cuenta" del todo, solo movidos de
              lugar y separados con más aire para que no se lean como un link
              más de la lista. */}
          <div className={styles.mobileMenuActions} onClick={() => setOpen(false)}>{children}</div>
        </nav>
      )}
    </header>
  );
}
