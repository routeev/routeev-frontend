import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import buttons from "../shared/buttons.module.css";
import { SiteFooter } from "../shared/SiteFooter";
import { SiteHeader } from "../shared/SiteHeader";
import styles from "./LegalLayout.module.css";

interface LegalLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Layout compartido por /privacidad y /terminos (css/legal.css + nav minimal de esas páginas). */
export function LegalLayout({ title, description, children }: LegalLayoutProps) {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{`${title} — RouteEV`}</title>
        <meta name="description" content={description} />
      </Helmet>

      {/* Mismos navLinks (con hamburguesa en mobile) que ShowroomPage: antes
          esta página no pasaba navLinks, así que en pantallas angostas el
          "Showroom" quedaba suelto en la barra en vez de colapsar como en
          el resto del sitio -- un header con forma distinta según de qué
          página pública se tratara. */}
      <SiteHeader navLinks={[{ href: "/", label: t.landing.nav.home }, { href: "/showroom", label: t.landing.nav.showroom }]}>
        <Link to="/login" className={buttons.navLink}>
          {t.landing.header.login}
        </Link>
        <Link to="/login?crear=1" className={buttons.primary}>
          {t.landing.header.createAccount}
        </Link>
      </SiteHeader>

      <main className={styles.legal}>
        {/* Mismo patrón "eyebrow + título" que landing/showroom (ver
            .eyebrow en LandingPage.module.css) -- antes esta página
            arrancaba directo en el <h1>, sin la etiqueta mono en mayúsculas
            que ata visualmente cada sección del resto del sitio público. */}
        <p className={styles.eyebrow}>{t.legal.eyebrow}</p>
        {children}
      </main>

      <SiteFooter />
    </>
  );
}
