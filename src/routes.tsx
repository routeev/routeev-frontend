import { Suspense, type JSX } from "react";
import { createBrowserRouter } from "react-router-dom";
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
import { RouteFallback } from "./shared/RouteFallback";

function withFallback(element: JSX.Element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

// Reemplaza la tabla ROUTES de scripts/dev-server.js (front2.md 1.7): con
// SPA fallback nativo del hosting (vercel.json / _redirects) no hace falta
// mantener esa tabla a mano ni depender de rutas con .html.
export const router = createBrowserRouter([
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
]);
