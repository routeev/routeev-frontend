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

      <SiteHeader>
        <Link to="/showroom" className={buttons.navLink}>
          {t.landing.nav.showroom}
        </Link>
      </SiteHeader>

      <main className={styles.legal}>{children}</main>

      <SiteFooter />
    </>
  );
}
