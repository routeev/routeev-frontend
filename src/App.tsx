import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { setOnSessionExpired } from "./api/client";
import { router } from "./routes";
import { ToastViewport } from "./shared/ToastViewport";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Espejo del redirect global en 401-con-token de js/api.js (front2.md
    // 1.5): centralizado aca en vez de repetido por pantalla.
    setOnSessionExpired(() => {
      void router.navigate("/login");
    });
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/* Fuera del router a propósito: el live region tiene que estar en el
            DOM antes de que aparezca el primer aviso, y sobrevivir a los
            cambios de ruta. Montado acá, una navegación no lo desmonta ni lo
            vuelve a crear (que sería lo mismo que no tenerlo). */}
        <ToastViewport />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
