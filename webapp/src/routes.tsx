import { createBrowserRouter } from "react-router-dom";
import { GuestOnlyRoute } from "./auth/GuestOnlyRoute";
import { LoginPage } from "./auth/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LandingPage } from "./landing/LandingPage";
import { PrivacyPage } from "./legal/PrivacyPage";
import { TermsPage } from "./legal/TermsPage";
import { MapPage } from "./map/MapPage";
import { ProfilePage } from "./profile/ProfilePage";
import { ShowroomPage } from "./showroom/ShowroomPage";

// Reemplaza la tabla ROUTES de scripts/dev-server.js (front2.md 1.7): con
// SPA fallback nativo del hosting (vercel.json / _redirects) no hace falta
// mantener esa tabla a mano ni depender de rutas con .html.
export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    path: "/login",
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <MapPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  { path: "/showroom", element: <ShowroomPage /> },
  { path: "/privacidad", element: <PrivacyPage /> },
  { path: "/terminos", element: <TermsPage /> },
]);
