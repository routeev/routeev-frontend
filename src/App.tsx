import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { setOnSessionExpired } from "./api/client";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { router } from "./routes";
import { ToastViewport } from "./shared/ToastViewport";
import { syncThemeForRoute } from "./theme/theme";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Espejo del redirect global en 401-con-token de js/api.js (front2.md
    // 1.5): centralizado aca en vez de repetido por pantalla.
    setOnSessionExpired(() => {
      void router.navigate("/login");
    });
  }, []);

  useEffect(() => {
    // El tema es una preferencia de /app y /profile, no del sitio entero
    // (ver theme.ts) -- fuera del componente de ruta a propósito, porque
    // router (createBrowserRouter, no <BrowserRouter>) vive afuera del
    // árbol de React y useLocation() no serviría acá. router.subscribe
    // corre en cada navegación, cliente y sin recargar la página, así que
    // entrar a /app desde la landing (o salir con "Cerrar sesión") aplica
    // el tema correcto al toque, no recién en el próximo refresh. Se llama
    // una vez de entrada con la ruta actual porque subscribe solo avisa de
    // cambios FUTUROS -- sin esto, cargar la página directo en /app
    // dependería solo del script inline de index.html (que sí corre en la
    // primera carga, pero no en una navegación client-side después).
    syncThemeForRoute(router.state.location.pathname);
    return router.subscribe((state) => {
      syncThemeForRoute(state.location.pathname);
    });
  }, []);

  return (
    <HelmetProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          {/* Fuera del router a propósito: el live region tiene que estar en el
              DOM antes de que aparezca el primer aviso, y sobrevivir a los
              cambios de ruta. Montado acá, una navegación no lo desmonta ni lo
              vuelve a crear (que sería lo mismo que no tenerlo). */}
          <ToastViewport />
        </QueryClientProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
}

export default App;
