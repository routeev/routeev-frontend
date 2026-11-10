import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconPlus } from "../map/panelIcons";
import { useToastStore } from "../shared/toastStore";
import { CONTACT_EMAIL } from "./LandingFooter";
import { IconArrowRight, IconCopy, IconInstagram, IconMail } from "./landingIcons";
import styles from "./Faq.module.css";

const INSTAGRAM_URL = "https://www.instagram.com/routeev.uy/";

/**
 * Preguntas frecuentes y contacto, antes del cierre: las dudas se resuelven
 * justo antes del último llamado a probar. El acordeón es <details> nativo
 * (teclado y lectores de pantalla sin JS propio), numerado como los pasos de
 * HowItWorks. El contacto no tiene formulario: los temas abren el correo con
 * el asunto puesto, así no hace falta un endpoint ni cuidar el spam.
 */
export function Faq() {
  const { t } = useTranslation();
  const f = t.landing.faq;
  const c = f.contact;
  const pushToast = useToastStore((s) => s.push);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      pushToast("ok", c.emailCopied);
    } catch {
      // Sin permiso para el portapapeles: el correo está escrito al lado.
    }
  }

  return (
    <section id="preguntas" aria-labelledby="preguntas-titulo" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id="preguntas-titulo" className={styles.title}>
            {f.title}
          </h2>
          <p className={styles.body}>{f.body}</p>
        </div>

        <div className={styles.list}>
          {f.items.map((item, i) => (
            <details key={item.question} className={styles.item} open={i === 0}>
              <summary className={styles.summary}>
                <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className={styles.question}>{item.question}</h3>
                <span className={styles.toggle}>
                  <IconPlus />
                </span>
              </summary>
              <div className={styles.answer}>
                <p>{item.answer}</p>
                {"privacyLink" in item && (
                  <Link to="/privacidad" className={styles.answerLink}>
                    {item.privacyLink}
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>

        <div id="contacto" className={styles.contact}>
          <span className={styles.contactLabel}>
            <span className={styles.contactIcon}>
              <IconMail />
            </span>
            {c.label}
          </span>
          <p className={styles.contactTitle}>{c.title}</p>
          <ul className={styles.topics} aria-label={c.topicsAria}>
            {c.topics.map((topic) => (
              <li key={topic}>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(topic)}`}
                  className={styles.topic}
                >
                  {topic}
                </a>
              </li>
            ))}
          </ul>
          <div className={styles.channels}>
            <div className={styles.email}>
              <span className={styles.emailAddress}>{CONTACT_EMAIL}</span>
              <button
                type="button"
                className={styles.copy}
                aria-label={c.copyEmail}
                onClick={copyEmail}
              >
                <IconCopy />
              </button>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.instagram}
            >
              <IconInstagram size={18} />
              {c.instagram}
            </a>
          </div>
          <a href={`mailto:${CONTACT_EMAIL}`} className={styles.cta}>
            {c.cta}
            <IconArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}
