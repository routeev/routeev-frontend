import { lazy } from "react";

// Cada pantalla se baja en su propio chunk (front2.md, webapp/README "Pendiente":
// el bundle unico de ~650kB). Leaflet (app/showroom) y Google Sign-In (login) salen
// asi del chunk inicial de la landing, que es la pantalla publica mas visitada.
export const LandingPage = lazy(() =>
  import("./landing/LandingPage").then((m) => ({ default: m.LandingPage })),
);
export const LoginPage = lazy(() =>
  import("./auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
export const MapPage = lazy(() => import("./map/MapPage").then((m) => ({ default: m.MapPage })));
export const ProfilePage = lazy(() =>
  import("./profile/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
export const ShowroomPage = lazy(() =>
  import("./showroom/ShowroomPage").then((m) => ({ default: m.ShowroomPage })),
);
export const PrivacyPage = lazy(() =>
  import("./legal/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
export const TermsPage = lazy(() =>
  import("./legal/TermsPage").then((m) => ({ default: m.TermsPage })),
);
