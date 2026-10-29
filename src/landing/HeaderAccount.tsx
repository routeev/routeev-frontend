import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearSession, getUsername } from "../api/session";
import { getMe, nombreParaMostrar } from "../api/user";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconChevronDown } from "../map/panelIcons";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { useSeason } from "../season/season";
import { setTheme, type Theme } from "../theme/theme";
import { useActiveTheme } from "../theme/useActiveTheme";
import { IconLogout, IconMoon, IconSun, IconUser } from "./landingIcons";
import styles from "./LandingHeader.module.css";

// Lo que el header suma en las pantallas con cuenta (/app y /profile): el
// tema y la cuenta. Aparte de LandingHeader.tsx porque solo ahí hace falta
// pedir /api/users/me.

function useAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Misma queryKey que AccountSection y ProfilePage: si ya se pidió, sale del
  // cache sin otro fetch.
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const name = nombreParaMostrar(me ?? { username: getUsername() ?? "" }) || t.nav.fallbackUsername;

  function logout() {
    clearSession();
    navigate("/");
  }

  return { name, email: me?.email, photoUrl: me?.photo_url, logout };
}

function Avatar({
  name,
  photoUrl,
  size,
}: {
  name: string;
  photoUrl?: string | null;
  size: number;
}) {
  return photoUrl ? (
    <img
      src={cloudinaryResize(photoUrl, size * 2)}
      className={styles.avatar}
      width={size}
      height={size}
      alt=""
    />
  ) : (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

const THEMES: { code: Theme; Icon: typeof IconSun }[] = [
  { code: "light", Icon: IconSun },
  { code: "dark", Icon: IconMoon },
];

/**
 * Claro / oscuro, segmentado como el idioma. Lee el tema aplicado (no un
 * estado propio): el de la barra y el del menú del celular nunca se
 * desincronizan.
 */
export function ThemeSeg({ inMenu = false }: { inMenu?: boolean }) {
  const { t } = useTranslation();
  const active = useActiveTheme();
  // Durante la edición Halloween la app es siempre oscura (ver theme.ts): no
  // hay tema para elegir. La preferencia guardada vuelve cuando termina.
  const season = useSeason();
  if (season) return null;
  const label = (code: Theme) => (code === "light" ? t.common.lightMode : t.common.darkMode);

  if (inMenu) {
    return (
      <div className={styles.menuLang}>
        <span id="menu-tema" className={styles.menuLangLabel}>
          {t.common.themeSwitcherLabel}
        </span>
        <div role="group" aria-labelledby="menu-tema" className={styles.menuLangSeg}>
          {THEMES.map(({ code, Icon }) => (
            <button
              key={code}
              type="button"
              aria-pressed={active === code}
              onClick={() => setTheme(code)}
            >
              <Icon />
              {code === "light" ? t.landing.nav.light : t.landing.nav.dark}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role="group" aria-label={t.common.themeSwitcherLabel} className={styles.langSeg}>
      {THEMES.map(({ code, Icon }) => (
        <button
          key={code}
          type="button"
          aria-pressed={active === code}
          aria-label={label(code)}
          title={label(code)}
          onClick={() => setTheme(code)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}

/**
 * La cuenta en la barra de escritorio: avatar + nombre, y al tocarlo Mi
 * perfil y Cerrar sesión. En /profile se marca como la página actual, con la
 * misma línea menta que un link del nav.
 */
export function AccountMenu({ current }: { current: boolean }) {
  const { t } = useTranslation();
  const { name, email, photoUrl, logout } = useAccount();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.account} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={current ? styles.accountBtnCurrent : styles.accountBtn}
        aria-expanded={open}
        aria-controls="menu-cuenta"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} photoUrl={photoUrl} size={30} />
        <span className={styles.accountName}>{name}</span>
        <IconChevronDown size={16} />
      </button>
      {open && (
        <div id="menu-cuenta" className={styles.accountPanel}>
          <div className={styles.accountHead}>
            <span className={styles.accountHeadName}>{name}</span>
            {email && <span className={styles.accountHeadEmail}>{email}</span>}
          </div>
          <Link
            to="/profile"
            className={styles.accountItem}
            aria-current={current ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <IconUser />
            {t.nav.myProfile}
          </Link>
          <button type="button" className={styles.accountItem} onClick={logout}>
            <IconLogout />
            {t.nav.logout}
          </button>
        </div>
      )}
    </div>
  );
}

/** El pie del menú del celular: quién tiene la sesión abierta y Cerrar sesión. */
export function MenuAccount() {
  const { t } = useTranslation();
  const { name, email, photoUrl, logout } = useAccount();

  return (
    <div className={styles.menuActions}>
      <div className={styles.menuAccount}>
        <Avatar name={name} photoUrl={photoUrl} size={40} />
        <span className={styles.menuAccountText}>
          <span className={styles.accountHeadName}>{name}</span>
          {email && <span className={styles.accountHeadEmail}>{email}</span>}
        </span>
      </div>
      <button type="button" className={styles.menuOutline} onClick={logout}>
        <IconLogout />
        {t.nav.logout}
      </button>
    </div>
  );
}
