import { lazy } from "react";
import { getToken } from "./api/session";
import { shouldShowWelcome } from "./welcome/welcomeGate";

// Cada pantalla se baja en su propio chunk (front2.md, webapp/README "Pendiente":
// el bundle unico de ~650kB). Leaflet (app/showroom) y Google Sign-In (login) salen
// asi del chunk inicial de la landing, que es la pantalla publica mas visitada.
const loadWelcome = () => import("./welcome/WelcomePage");

export const LandingPage = lazy(() => {
  // A quien le toca la bienvenida encima de la home, se le baja a la par de
  // la landing y no recién cuando esta se muestra.
  if (shouldShowWelcome(Boolean(getToken()))) void loadWelcome();
  return import("./landing/LandingPage").then((m) => ({ default: m.LandingPage }));
});
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
export const WelcomePage = lazy(() => loadWelcome().then((m) => ({ default: m.WelcomePage })));
