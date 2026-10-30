import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { getToken } from "../api/session";
import { useTranslation } from "../i18n/LanguageProvider";
import { WelcomePage } from "../lazyPages";
import { IconCheck } from "../map/panelIcons";
import { markWelcomeSeen, shouldShowWelcome } from "../welcome/welcomeGate";
import { BatteryDemo } from "./BatteryDemo";
import { HeroMap } from "./HeroMap";
import { HowItWorks } from "./HowItWorks";
import { CONTACT_EMAIL, LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { IconArrowRight, IconMonitor, IconPhone } from "./landingIcons";
import { StoreRow } from "./StoreRow";
import styles from "./LandingPage.module.css";
import { HeroNight } from "../season/HalloweenDecor";

/**
 * La home. Una idea por sección y el producto a la vista: el resultado de un
 * viaje se muestra con los mismos componentes de /app. Dos entradas, en este
 * orden: probar ya en el showroom (sin cuenta, en el hero) y bajar la app (en
 * el cierre). Siempre oscura, y sin animaciones que dependan del scroll ni
 * WebGL: es la página a la que más se llega desde celulares de gama media.
 *
 * Quien entra al sitio por acá por primera vez ve antes la bienvenida, encima
 * y a pantalla completa, y la tiene que cerrar para usar la home.
 */
export function LandingPage() {
  const loggedIn = Boolean(getToken());
  const { t, lang } = useTranslation();
  const l = t.landing;
  const numberFormat = new Intl.NumberFormat(lang === "es" ? "es-UY" : "en-US");
  const { hash, key } = useLocation();
  // "default" es la primera página de la visita: llegando desde otra del
  // sitio (Inicio en el showroom) ya entró, y no sale.
  const [welcome, setWelcome] = useState(() => shouldShowWelcome(loggedIn, key === "default"));

  // Entrando desde otra página a una sección (/#app desde el menú del
  // showroom), ScrollRestoration busca el ancla mientras esta página todavía
  // se está bajando (es un chunk aparte), no la encuentra y deja el scroll
  // arriba. Dentro de la landing los links a secciones los resuelve él solo.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = [
    { value: numberFormat.format(63800), plus: true, label: l.data.intersections },
    { value: "19", plus: false, label: l.data.departments },
    { value: "261", plus: false, label: l.data.stations },
    { value: "328", plus: false, label: l.data.models },
  ];

  return (
    <div className={styles.page} inert={welcome}>
      <Helmet>
        <title>{l.meta.title}</title>
        <meta name="description" content={l.meta.description} />
        <link rel="canonical" href="https://routeev.uy/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={lang === "es" ? "es_UY" : "en_US"} />
        <meta property="og:site_name" content="RouteEV" />
        <meta property="og:url" content="https://routeev.uy/" />
        <meta property="og:title" content={l.meta.ogTitle} />
        <meta property="og:description" content={l.meta.ogDescription} />
        <meta property="og:image" content="https://routeev.uy/img/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "RouteEV",
            url: "https://routeev.uy/",
            description: l.meta.jsonLdDescription,
            applicationCategory: "TravelApplication",
            operatingSystem: "Any (web)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "UYU" },
            areaServed: { "@type": "Country", name: "Uruguay" },
            author: { "@type": "Organization", name: "RouteEV", email: CONTACT_EMAIL },
          })}
        </script>
        {/* Aparte del WebApplication de arriba: es el tipo WebSite +
            "name" el que Google documenta como señal para el nombre que
            muestra en los resultados de búsqueda (al lado del favicon,
            "RouteEV" en vez del dominio "routeev.uy") -- og:site_name ya
            lo decía, esto refuerza la misma señal por el otro camino. */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "RouteEV",
            url: "https://routeev.uy/",
          })}
        </script>
      </Helmet>

      <LandingHeader loggedIn={loggedIn} />

      <main>
        <section aria-labelledby="hero-titulo" className={styles.hero}>
          {/* Primero en el DOM a proposito: los adornos van debajo del
              resplandor y del texto (.heroText ya es z-index 1). */}
          <HeroNight />
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                {l.hero.eyebrow}
              </span>
              <h1 id="hero-titulo" className={styles.heroTitle}>
                {l.hero.titleLead} <span className={styles.accent}>{l.hero.titleAccent}</span>
              </h1>
              <p className={styles.heroSub}>{l.hero.subtitle}</p>
              <div className={styles.heroCtas}>
                <div className={styles.ctaRow}>
                  <Link to="/showroom" className={styles.ctaPrimary}>
                    {l.hero.cta}
                    <IconArrowRight />
                  </Link>
                  <Link
                    to={loggedIn ? "/app" : "/login?crear=1"}
                    className={[styles.underlineLink, styles.heroSecondary].join(" ")}
                  >
                    {loggedIn ? l.hero.ctaApp : l.hero.ctaSignup}
                  </Link>
                </div>
                <span className={styles.heroNote}>
                  <IconCheck size={16} />
                  {l.hero.note}
                </span>
              </div>
              {/* La app tiene su lugar entero (badges + QR) en el cierre; acá
                  solo un link discreto que baja hasta ahí. <Link> y no
                  <a href="#app">: ver la nota en LandingHeader. */}
              <Link to="#app" className={styles.appLink}>
                <IconPhone size={16} />
                {l.hero.appLink}
              </Link>
            </div>

            <HeroMap />
          </div>
        </section>

        <section id="datos" aria-labelledby="datos-titulo" className={styles.data}>
          <div className={styles.dataInner}>
            <div className={styles.dataIntro}>
              <h2 id="datos-titulo" className={styles.dataTitle}>
                {l.data.title}
              </h2>
              <p className={styles.dataBody}>{l.data.body}</p>
            </div>
            <dl className={styles.stats}>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <dt className={styles.statLabel}>{stat.label}</dt>
                  <dd className={styles.statValue}>
                    {stat.value}
                    {stat.plus && <span className={styles.statPlus}>+</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <BatteryDemo />

        <HowItWorks />

        <section id="app" aria-labelledby="cierre-titulo" className={styles.closing}>
          <div className={styles.closingGlow} aria-hidden="true" />
          <div className={styles.closingInner}>
            <h2 id="cierre-titulo" className={styles.closingTitle}>
              {l.closing.title}
            </h2>
            <div className={styles.closingCards}>
              <div className={styles.closingCard}>
                <span className={styles.closingLabel}>
                  <span className={styles.closingIcon}>
                    <IconMonitor />
                  </span>
                  {l.closing.webLabel}
                </span>
                <p className={styles.closingBody}>{l.closing.webBody}</p>
                <div className={styles.closingActions}>
                  <Link to="/showroom" className={styles.ctaPrimary}>
                    {l.closing.webCta}
                    <IconArrowRight />
                  </Link>
                  <Link to={loggedIn ? "/app" : "/login?crear=1"} className={styles.underlineLink}>
                    {loggedIn ? l.header.goToApp : l.header.createFreeAccount}
                  </Link>
                </div>
              </div>
              <div className={styles.closingCard}>
                <span className={styles.closingLabel}>
                  <span className={styles.closingIcon}>
                    <IconPhone />
                  </span>
                  {l.closing.phoneLabel}
                </span>
                <p className={styles.closingBody}>{l.closing.phoneBody}</p>
                <div className={styles.closingActions}>
                  <StoreRow />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* Directo en el <body> para que el inert de la home no la alcance. Sin
          un Suspense propio: la home espera a que esté lista y no se ve un
          instante antes de quedar tapada. */}
      {welcome &&
        createPortal(
          <WelcomePage
            onContinue={() => {
              markWelcomeSeen();
              setWelcome(false);
            }}
          />,
          document.body
        )}
    </div>
  );
}
