import { useTranslation } from "../i18n/LanguageProvider";
import { LegalLayout } from "./LegalLayout";
import styles from "./LegalLayout.module.css";

export function PrivacyPage() {
  const { t } = useTranslation();
  const p = t.legal.privacy;

  return (
    <LegalLayout title={p.pageTitle} description={p.metaDescription}>
      <h1>{p.pageTitle}</h1>
      <p className={styles.fecha}>{p.lastUpdated}</p>

      <p className={styles.resumen}>{p.summary}</p>

      <h2>{p.responsible.heading}</h2>
      <p>
        {p.responsible.before} <a href="mailto:routemindtbo@gmail.com">routemindtbo@gmail.com</a>
        {p.responsible.after}
      </p>

      <h2>{p.dataCollected.heading}</h2>
      <p>{p.dataCollected.intro}</p>

      <h3>{p.noAccount.heading}</h3>
      <p>{p.noAccount.body}</p>

      <h3>{p.withAccount.heading}</h3>
      <ul>
        <li>
          <strong>{p.withAccount.username.label}</strong> {p.withAccount.username.body}
        </li>
        <li>
          <strong>{p.withAccount.vehicles.label}</strong> {p.withAccount.vehicles.body}
        </li>
        <li>
          <strong>{p.withAccount.history.label}</strong> {p.withAccount.history.body}
        </li>
      </ul>

      <h3>{p.google.heading}</h3>
      <p>{p.google.body}</p>

      <h3>{p.mobileTracking.heading}</h3>
      <p>{p.mobileTracking.body}</p>

      <h2>{p.usage.heading}</h2>
      <ul>
        <li>{p.usage.items.login}</li>
        <li>{p.usage.items.routes}</li>
        <li>{p.usage.items.stats}</li>
      </ul>
      <p>
        <strong>{p.usage.noSellBold}</strong>
        {p.usage.noSellRest}
      </p>

      <h2>{p.sharing.heading}</h2>
      <p>{p.sharing.body}</p>

      <h2>{p.retention.heading}</h2>
      <p>{p.retention.body}</p>

      <h2>{p.rights.heading}</h2>
      <p>
        {p.rights.before} <strong>{p.rights.lawNameBold}</strong> {p.rights.afterLawBeforeEmail}{" "}
        <a href="mailto:routemindtbo@gmail.com">routemindtbo@gmail.com</a> {p.rights.afterEmail}
      </p>
      <p>{p.rights.complaint}</p>

      <h2>{p.cookies.heading}</h2>
      <p>{p.cookies.body}</p>

      <h2>{p.changes.heading}</h2>
      <p>{p.changes.body}</p>

      <p className={styles.nota}>{p.note}</p>
    </LegalLayout>
  );
}
