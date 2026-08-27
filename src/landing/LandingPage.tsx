import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { getToken } from "../api/session";
import { useTranslation } from "../i18n/LanguageProvider";
import buttons from "../shared/buttons.module.css";
import { GradientWaves } from "../shared/GradientWaves";
import { Reveal } from "../shared/Reveal";
import { SiteFooter } from "../shared/SiteFooter";
import { SiteHeader } from "../shared/SiteHeader";
import { UruguayGraph } from "../shared/UruguayGraph";
import { StatCard } from "./StatCard";
import styles from "./LandingPage.module.css";

export function LandingPage() {
  const loggedIn = Boolean(getToken());
  const { t, lang } = useTranslation();

  const STATS = [
    {
      value: 63800,
      places: [10000, 1000, ".", 100, 10, 1] as const,
      suffix: "+",
      label: t.landing.stats.intersections,
    },
    { value: 19, label: t.landing.stats.departments },
    { value: 259, label: t.landing.stats.stations },
    { value: 631, label: t.landing.stats.models },
  ];

  const HOW_IT_WORKS = [
    t.landing.howItWorks.steps.loadVehicle,
    t.landing.howItWorks.steps.markOriginDestination,
    t.landing.howItWorks.steps.calculateRoute,
    t.landing.howItWorks.steps.viewTripData,
  ];

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.landing.meta.title}</title>
        <meta name="description" content={t.landing.meta.description} />
        <link rel="canonical" href="https://routeev.uy/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={lang === "es" ? "es_UY" : "en_US"} />
        <meta property="og:site_name" content="RouteEV" />
        <meta property="og:url" content="https://routeev.uy/" />
        <meta property="og:title" content={t.landing.meta.ogTitle} />
        <meta property="og:description" content={t.landing.meta.ogDescription} />
        <meta property="og:image" content="https://routeev.uy/img/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "RouteEV",
            url: "https://routeev.uy/",
            description: t.landing.meta.jsonLdDescription,
            applicationCategory: "TravelApplication",
            operatingSystem: "Any (web)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "UYU" },
            areaServed: { "@type": "Country", name: "Uruguay" },
            author: { "@type": "Organization", name: "RouteEV", email: "routemindtbo@gmail.com" },
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

      <SiteHeader
        navLinks={[
          { href: "/showroom", label: t.landing.nav.showroom },
          { href: "#como-funciona", label: t.landing.nav.howItWorks },
          { href: "#datos-reales", label: t.landing.nav.realData },
        ]}
      >
        {loggedIn ? (
          <Link to="/app" className={buttons.primary}>
            {t.landing.header.goToApp}
          </Link>
        ) : (
          <>
            <Link to="/login" className={buttons.navLink}>
              {t.landing.header.login}
            </Link>
            <Link to="/login?crear=1" className={buttons.primary}>
              {t.landing.header.createAccount}
            </Link>
          </>
        )}
      </SiteHeader>

      <main>
        <section className={styles.heroWrap}>
          <GradientWaves
            horizonColor="#0a0e13"
            waveColor="#1a212c"
            crestColor="#34e3a8"
            speed={0.3}
            amplitude={2}
            opacity={0.85}
            brightness={0.9}
            grainIntensity={0.035}
          />
          <div className={[styles.section, styles.hero].join(" ")}>
            <div>
              <p className={styles.eyebrow}>{t.landing.hero.eyebrow}</p>
              <h1>
                {t.landing.hero.titleLine1}
                <br />
                {t.landing.hero.titleLine2}
              </h1>
              <p className={styles.heroSub}>{t.landing.hero.subtitle}</p>
              <div className={styles.heroActions}>
                <Link to="/showroom" className={[buttons.primary, buttons.large].join(" ")}>
                  {t.landing.hero.ctaPrimary}
                </Link>
                <Link to="/login?crear=1" className={[buttons.ghost, buttons.large].join(" ")}>
                  {t.landing.hero.ctaSecondary}
                </Link>
              </div>
              <p className={styles.heroNote}>{t.landing.hero.note}</p>
            </div>

            <div className={styles.heroVisual}>
              <UruguayGraph />
              <p className={styles.heroVisualCaption}>{t.landing.hero.visualCaption}</p>
            </div>
          </div>
        </section>

        <Reveal id="datos-reales" className={[styles.section, styles.stats].join(" ")}>
          {STATS.map((stat, i) => (
            <StatCard
              key={stat.label}
              index={i}
              value={stat.value}
              places={stat.places ? [...stat.places] : undefined}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </Reveal>

        <Reveal className={[styles.section, styles.split].join(" ")}>
          <div>
            <p className={styles.eyebrow}>{t.landing.problem.eyebrow}</p>
            <h2>{t.landing.problem.title}</h2>
            <p>{t.landing.problem.body}</p>
          </div>
          <div>
            <p className={styles.eyebrow}>{t.landing.solution.eyebrow}</p>
            <h2>{t.landing.solution.title}</h2>
            <p>{t.landing.solution.body}</p>
          </div>
        </Reveal>

        <Reveal className={[styles.section, styles.showroom].join(" ")}>
          <div>
            <p className={styles.eyebrow}>{t.landing.showroomSection.eyebrow}</p>
            <h2>{t.landing.showroomSection.title}</h2>
            <p>{t.landing.showroomSection.body1}</p>
            <p>{t.landing.showroomSection.body2}</p>
            <Link to="/showroom" className={[buttons.primary, buttons.large].join(" ")}>
              {t.landing.showroomSection.cta}
            </Link>
          </div>
          {/* Check, no "01-04": la lista de pasos numerados de verdad es
              "Cómo funciona" un poco más abajo en esta misma página -- con
              el mismo estilo de número acá, las dos se leían como la misma
              lista repetida en el scroll. Este es un resumen de lo que
              ofrece el showroom, no una instrucción a seguir en orden. */}
          <ul className={styles.showroomSteps}>
            {[
              t.landing.showroomSection.steps.search,
              t.landing.showroomSection.steps.view,
              t.landing.showroomSection.steps.choose,
              t.landing.showroomSection.steps.result,
            ].map((step) => (
              <li key={step}>
                <svg
                  className={styles.showroomStepIcon}
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12.5l2.5 2.5L16 9.5" />
                </svg>
                {step}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal id="como-funciona" className={[styles.section, styles.steps].join(" ")}>
          <p className={[styles.eyebrow, styles.eyebrowCenter].join(" ")}>{t.landing.howItWorks.eyebrow}</p>
          <h2 className={styles.stepsTitle}>{t.landing.howItWorks.title}</h2>
          <ol className={styles.stepsList}>
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className={[styles.section, styles.finalCta].join(" ")}>
          <h2>{t.landing.finalCta.title}</h2>
          <p>{t.landing.finalCta.body}</p>
          <div className={[styles.heroActions, styles.heroActionsCenter].join(" ")}>
            <Link to="/showroom" className={[buttons.primary, buttons.large].join(" ")}>
              {t.landing.finalCta.ctaPrimary}
            </Link>
            <Link to="/login?crear=1" className={[buttons.ghost, buttons.large].join(" ")}>
              {t.landing.finalCta.ctaSecondary}
            </Link>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
