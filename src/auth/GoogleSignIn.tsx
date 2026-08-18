import { useQuery } from "@tanstack/react-query";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { authConfig } from "../api/auth";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./LoginPage.module.css";

interface GoogleSignInProps {
  onCredential: (credential: string) => void;
}

/**
 * Reemplaza el waitForGoogleIdentityServices() con polling manual de
 * js/login.js: @react-oauth/google carga el script de Google Identity
 * Services por su cuenta y no renderiza nada hasta que está listo, así que
 * la condición de carrera contra el script `async` desaparece sola.
 *
 * El botón solo existe si el backend tiene un Client ID configurado (mismo
 * criterio que el sitio actual: sin eso, el login usuario/contraseña sigue
 * funcionando igual).
 */
export function GoogleSignIn({ onCredential }: GoogleSignInProps) {
  const { t } = useTranslation();
  const { data: cfg } = useQuery({ queryKey: ["authConfig"], queryFn: authConfig, retry: false });
  const containerRef = useRef<HTMLDivElement>(null);
  // El prop `width` de GoogleLogin es un ancho fijo en px que Google usa tal
  // cual para dibujar el iframe del botón -- no es responsive. En celulares
  // angostos, un valor fijo (antes 320) se pasaba del ancho real disponible
  // dentro de la tarjeta de login y quedaba recortado por el `overflow:
  // hidden` de .page (LoginPage.module.css), o directamente no se veía. Acá
  // se mide el contenedor real y se lo pasa como ancho, así siempre entra.
  const [btnWidth, setBtnWidth] = useState(320);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setBtnWidth(Math.round(Math.min(320, width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!cfg?.google_client_id) return null;

  return (
    <GoogleOAuthProvider clientId={cfg.google_client_id}>
      <div className={styles.googleDivider}>
        <span>{t.auth.google.divider}</span>
      </div>
      <div className={styles.googleBtn} ref={containerRef}>
        <GoogleLogin
          theme="filled_black"
          shape="pill"
          size="large"
          width={btnWidth}
          onSuccess={(response) => {
            if (response.credential) onCredential(response.credential);
          }}
        />
      </div>
    </GoogleOAuthProvider>
  );
}
