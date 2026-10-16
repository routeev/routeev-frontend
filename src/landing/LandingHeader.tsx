import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation, type Lang } from "../i18n/LanguageProvider";
import { IconClose } from "../map/panelIcons";
import { useMediaQuery } from "../shared/useMediaQuery";
import { AccountMenu, MenuAccount, ThemeSeg } from "./HeaderAccount";
import { IconArrowRight, IconChevronRight, IconMenu } from "./landingIcons";
import styles from "./LandingHeader.module.css";

// Cada idioma con su propio nombre, no traducido: quien busca "English" en
// una página en español tiene que poder encontrarlo.
const LANGS: { code: Lang; short: string; name: string }[] = [
  { code: "es", short: "ES", name: "Español" },
  { code: "en", short: "EN", name: "English" },
];

const FOCUSABLE = "a[href], button:not([disabled])";

// El link a la sección de la app (#app) va por <Link> y no por
// <a href="#..."> a propósito: un <a> suelto lo toma el
// <ScrollRestoration /> de routes.tsx como un "atrás" del navegador, restaura
// el scroll de la entrada anterior (arriba de todo) y la página no se mueve.
// Con <Link> es una navegación nueva, y ScrollRestoration lleva al ancla.

interface LandingHeaderProps {
  loggedIn: boolean;
  /**
   * Quién lo usa. La landing linkea a sus propias secciones; el resto de las
   * páginas (showroom, legales, /app y /profile) linkea a la landing, y cada
   * una se marca como la página actual. /app y /profile suman el tema y la
   * cuenta en vez de los botones de sesión.
   */
  page?: "landing" | "showroom" | "legal" | "app" | "profile";
}

interface NavItem {
  to: string;
  label: string;
  current?: boolean;
}

/**
 * Header de todo el sitio: landing, showroom, legales, /app y /profile. En
 * escritorio, nav + idioma + cuenta en la barra; por debajo de 900px todo eso
 * pasa a un menú a pantalla completa. Mismo corte que el resto del sitio.
 */
export function LandingHeader({ loggedIn, page = "landing" }: LandingHeaderProps) {
  const { t, lang, setLang } = useTranslation();
  const n = t.landing.nav;
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Si la ventana pasa a escritorio con el menú abierto, el menú se va (el
  // botón que lo cierra ya no se ve) y el scroll de la página vuelve.
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const menuOpen = open && !isDesktop;

  useEffect(() => {
    if (!menuOpen) return;
    const panel = panelRef.current;
    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });

    // El foco da vueltas entre el botón de cerrar y lo que hay en el panel,
    // sin salir a la página que quedó tapada.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggle?.focus();
        return;
      }
      if (e.key !== "Tab" || !panel || !toggle) return;
      const items = [toggle, ...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && index <= 0) {
        e.preventDefault();
        items[items.length - 1]!.focus();
      } else if (!e.shiftKey && (index === -1 || index === items.length - 1)) {
        e.preventDefault();
        items[0]!.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const close = () => setOpen(false);

  const landing = page === "landing";
  const withAccount = page === "app" || page === "profile";
  // En las pantallas con cuenta (mapa y perfil), sin Inicio ni Showroom:
  // ahí se va a planificar.
  const nav: NavItem[] = landing
    ? [{ to: "/showroom", label: n.showroom }]
    : withAccount
      ? [{ to: "/app", label: n.map, current: page === "app" }]
      : [
          { to: "/", label: n.home },
          { to: "/showroom", label: n.showroom, current: page === "showroom" },
        ];
  // En escritorio "Mi perfil" vive en el menú de la cuenta; en el celular es
  // un link más.
  const menu: NavItem[] = withAccount
    ? [...nav, { to: "/profile", label: t.nav.myProfile, current: page === "profile" }]
    : [...nav, { to: landing ? "#app" : "/#app", label: n.getApp }];

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logo} aria-label="RouteEV">
            <img src="/apple-touch-icon.png" alt="" width={30} height={30} />
            <span>
              Route<span className={styles.accent}>EV</span>
            </span>
          </Link>

          <nav aria-label={n.ariaLabel} className={styles.nav}>
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={item.current ? styles.navLinkCurrent : styles.navLink}
                aria-current={item.current ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <div role="group" aria-label={n.language} className={styles.langSeg}>
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={lang === l.code}
                  aria-label={l.name}
                  onClick={() => setLang(l.code)}
                >
                  {l.short}
                </button>
              ))}
            </div>
            {withAccount ? (
              <>
                <ThemeSeg />
                <AccountMenu current={page === "profile"} />
              </>
            ) : loggedIn ? (
              <Link to="/app" className={styles.primary}>
                {t.landing.header.goToApp}
                <IconArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.textLink}>
                  {t.landing.header.login}
                </Link>
                <Link to="/login?crear=1" className={styles.outline}>
                  {t.landing.header.createAccount}
                </Link>
              </>
            )}
          </div>

          <button
            ref={toggleRef}
            type="button"
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            aria-label={menuOpen ? n.closeMenu : n.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {menuOpen ? <IconClose size={22} /> : <IconMenu />}
          </button>
        </div>
      </header>

      {/* Afuera del <header> a propósito: su backdrop-filter lo vuelve el
          bloque contenedor de cualquier hijo con position:fixed, y el menú
          quedaba encerrado en los 56px de la barra en vez de tapar la
          pantalla. */}
      {menuOpen && (
        <div
          ref={panelRef}
          id="menu-movil"
          role="dialog"
          aria-modal="true"
          aria-label={n.menu}
          className={styles.menu}
        >
          <nav aria-label={n.ariaLabel} className={styles.menuNav}>
            {menu.map((item) =>
              item.current ? (
                <Link
                  key={item.to}
                  to={item.to}
                  className={styles.menuLinkCurrent}
                  aria-current="page"
                  onClick={close}
                >
                  <span className={styles.menuCurrentName}>
                    <span className={styles.menuCurrentDot} aria-hidden="true" />
                    {item.label}
                  </span>
                  <span className={styles.menuHere}>{n.here}</span>
                </Link>
              ) : (
                <Link key={item.to} to={item.to} className={styles.menuLink} onClick={close}>
                  {item.label}
                  <IconChevronRight />
                </Link>
              )
            )}
          </nav>

          <div className={styles.menuLang}>
            <span id="menu-idioma" className={styles.menuLangLabel}>
              {n.language}
            </span>
            <div role="group" aria-labelledby="menu-idioma" className={styles.menuLangSeg}>
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={lang === l.code}
                  onClick={() => setLang(l.code)}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {withAccount && <ThemeSeg inMenu />}

          {withAccount ? (
            <MenuAccount />
          ) : (
            <div className={styles.menuActions}>
              {loggedIn ? (
                <Link to="/app" className={styles.menuPrimary} onClick={close}>
                  {t.landing.header.goToApp}
                  <IconArrowRight />
                </Link>
              ) : (
                <>
                  <Link to="/login?crear=1" className={styles.menuOutline} onClick={close}>
                    {t.landing.header.createFreeAccount}
                  </Link>
                  <Link to="/login" className={styles.menuGhost} onClick={close}>
                    {t.landing.header.login}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
