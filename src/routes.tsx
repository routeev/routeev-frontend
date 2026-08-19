import { Suspense, type JSX } from "react";
import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router-dom";
import { GuestOnlyRoute } from "./auth/GuestOnlyRoute";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import {
  LandingPage,
  LoginPage,
  MapPage,
  PrivacyPage,
  ProfilePage,
  ShowroomPage,
  TermsPage,
} from "./lazyPages";
import { RouteErrorBoundary } from "./shared/RouteErrorBoundary";
import { RouteFallback } from "./shared/RouteFallback";

function withFallback(element: JSX.Element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

// Reemplaza la tabla ROUTES de scripts/dev-server.js (front2.md 1.7): con
// SPA fallback nativo del hosting (vercel.json / _redirects) no hace falta
// mantener esa tabla a mano ni depender de rutas con .html.
export const router = createBrowserRouter([
  {
    // Layout raiz sin path: un unico errorElement para todas las rutas en
    // vez de repetirlo en cada una. Sin esto, un chunk de React.lazy() que
    // falla en cargar (deploy viejo, red mala) reventaba hasta la pantalla
    // de error generica de react-router en vez de una propia.
    element: (
      <>
        <Outlet />
        {/* Sin esto, entrar a otra pagina (click en un Link, o
            router.navigate) mantenia el scroll donde estaba en la pagina
            anterior -- pedido explicito: toda pagina nueva arranca arriba
            del todo. Distingue solo por PUSH/REPLACE (nueva pagina) vs
            POP (atras/adelante del navegador, donde SI se espera volver a
            donde estabas), que es el comportamiento nativo del browser. */}
        <ScrollRestoration />
      </>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: withFallback(<LandingPage />) },
      {
        path: "/login",
        element: <GuestOnlyRoute>{withFallback(<LoginPage />)}</GuestOnlyRoute>,
      },
      {
        path: "/app",
        element: <ProtectedRoute>{withFallback(<MapPage />)}</ProtectedRoute>,
      },
      {
        path: "/profile",
        element: <ProtectedRoute>{withFallback(<ProfilePage />)}</ProtectedRoute>,
      },
      { path: "/showroom", element: withFallback(<ShowroomPage />) },
      { path: "/privacidad", element: withFallback(<PrivacyPage />) },
      { path: "/terminos", element: withFallback(<TermsPage />) },
    ],
  },
]);
