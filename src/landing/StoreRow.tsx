import { useTranslation } from "../i18n/LanguageProvider";
import {
  APP_STORE_URL,
  BADGES,
  GOOGLE_PLAY_URL,
  STORE_QR_SRC,
  detectMobileOs,
} from "../welcome/stores";
import styles from "./StoreRow.module.css";

/**
 * Badges de las dos tiendas, más el QR en escritorio. En el celular van los
 * dos badges siempre, uno al lado del otro y primero el de la tienda del
 * sistema, como en la bienvenida.
 */
export function StoreRow() {
  const { t, lang } = useTranslation();
  const badges = BADGES[lang];
  const playFirst = detectMobileOs(navigator.userAgent) === "android";

  return (
    <div className={styles.root}>
      <div className={[styles.stores, playFirst ? styles.playFirst : ""].join(" ")}>
        <a href={APP_STORE_URL} className={styles.badge}>
          <img {...badges.appStore} alt={t.welcome.stores.appStoreAlt} />
        </a>
        <a href={GOOGLE_PLAY_URL} className={[styles.badge, styles.playBadge].join(" ")}>
          <img {...badges.googlePlay} alt={t.welcome.stores.googlePlayAlt} />
        </a>
        <div className={styles.qrBlock}>
          <div className={styles.qr}>
            <img src={STORE_QR_SRC} alt={t.landing.stores.qrAlt} width={29} height={29} />
          </div>
          <span className={styles.qrHint}>{t.landing.stores.scanToGet}</span>
        </div>
      </div>
    </div>
  );
}
