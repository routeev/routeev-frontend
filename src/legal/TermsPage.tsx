import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { LegalLayout } from "./LegalLayout";
import styles from "./LegalLayout.module.css";

export function TermsPage() {
  const { t } = useTranslation();
  const s = t.legal.terms;

  return (
    <LegalLayout title={s.pageTitle} description={s.metaDescription}>
      <h1>{s.pageTitle}</h1>
      <p className={styles.fecha}>{s.lastUpdated}</p>

      <p className={styles.resumen}>
        {s.summaryBefore} <strong>{s.summaryBold}</strong> {s.summaryAfter}
      </p>

      <h2>{s.whatIs.heading}</h2>
      <p>{s.whatIs.body}</p>

      <h2>{s.usage.heading}</h2>
      <ul>
        <li>{s.usage.items.free}</li>
        <li>{s.usage.items.account}</li>
        <li>{s.usage.items.noAbuse}</li>
        <li>{s.usage.items.suspend}</li>
      </ul>

      <h2>{s.accuracy.heading}</h2>
      <p>{s.accuracy.intro}</p>
      <ul>
        <li>
          <strong>{s.accuracy.item1Bold}</strong> {s.accuracy.item1Rest}
        </li>
        <li>
          <strong>{s.accuracy.item2Bold}</strong> {s.accuracy.item2Rest}
        </li>
        <li>{s.accuracy.item3}</li>
      </ul>
      <p>
        <strong>{s.accuracy.responsibleBold}</strong> {s.accuracy.responsibleRest}
      </p>

      <h2>{s.liability.heading}</h2>
      <p>{s.liability.body}</p>

      <h2>{s.ip.heading}</h2>
      <p>
        {s.ip.part1}{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
          {s.ip.osmLabel}
        </a>
        {s.ip.part2}{" "}
        <a href="https://carto.com/attributions" target="_blank" rel="noopener">
          {s.ip.cartoLabel}
        </a>
        {s.ip.part3}
      </p>

      <h2>{s.accounts.heading}</h2>
      <p>
        {s.accounts.before} <a href="mailto:routemindtbo@gmail.com">routemindtbo@gmail.com</a>
        {s.accounts.afterEmailBeforeLink} <Link to="/privacidad">{s.accounts.privacyLinkLabel}</Link>
        {s.accounts.after}
      </p>

      <h2>{s.changes.heading}</h2>
      <p>{s.changes.body}</p>

      <h2>{s.law.heading}</h2>
      <p>{s.law.body}</p>

      <p className={styles.nota}>{s.note}</p>
    </LegalLayout>
  );
}
