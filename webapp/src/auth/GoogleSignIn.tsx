import { useQuery } from "@tanstack/react-query";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { authConfig } from "../api/auth";
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
  const { data: cfg } = useQuery({ queryKey: ["authConfig"], queryFn: authConfig, retry: false });

  if (!cfg?.google_client_id) return null;

  return (
    <GoogleOAuthProvider clientId={cfg.google_client_id}>
      <div className={styles.googleDivider}>
        <span>o</span>
      </div>
      <div className={styles.googleBtn}>
        <GoogleLogin
          theme="filled_black"
          shape="pill"
          size="large"
          width="320"
          onSuccess={(response) => {
            if (response.credential) onCredential(response.credential);
          }}
        />
      </div>
    </GoogleOAuthProvider>
  );
}
