import { useQuery } from "@tanstack/react-query";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { authConfig } from "../api/auth";
import { useTranslation } from "../i18n/LanguageProvider";
import styles from "./LoginPage.module.css";

interface GoogleSignInProps {
  onCredential: (credential: string) => void;
  /** En "Crear cuenta" el botón dice "Registrarse con Google". */
  signup?: boolean;
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
export function GoogleSignIn({ onCredential, signup = false }: GoogleSignInProps) {
  const { t, lang } = useTranslation();
  // staleTime: Infinity -- config publica del deploy, no cambia mientras el
  // backend esta corriendo (mismo criterio que el catalogo estatico de
  // useShowroomCatalog.ts/useMapLoaders.ts).
  const { data: cfg } = useQuery({
    queryKey: ["authConfig"],
    queryFn: authConfig,
    retry: false,
    staleTime: Infinity,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  // El prop `width` de GoogleLogin es un ancho fijo en px que Google usa tal
  // cual para dibujar el iframe del botón -- no es responsive. Se mide el
  // contenedor real (el mismo ancho que los campos) y se lo pasa como ancho,
  // así siempre entra y no queda más ancho que el formulario. Google no
  // acepta más de 400.
  const [btnWidth, setBtnWidth] = useState(336);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setBtnWidth(Math.round(Math.min(400, width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
    // El contenedor recién existe cuando llega la config (antes se devuelve
    // null): sin esta dependencia el efecto corría una sola vez, sin nada que
    // medir, y el botón quedaba siempre con el ancho inicial.
  }, [cfg?.google_client_id]);

  if (!cfg?.google_client_id) return null;

  return (
    <GoogleOAuthProvider clientId={cfg.google_client_id} locale={lang}>
      <div className={styles.google}>
        <div className={styles.googleDivider} aria-hidden="true">
          {t.auth.google.divider}
        </div>
        <div className={styles.googleBtn} ref={containerRef}>
          <GoogleLogin
            theme="filled_black"
            shape="pill"
            size="large"
            text={signup ? "signup_with" : "signin_with"}
            width={btnWidth}
            onSuccess={(response) => {
              if (response.credential) onCredential(response.credential);
            }}
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
