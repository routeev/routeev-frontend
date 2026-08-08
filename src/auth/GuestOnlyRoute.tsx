import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../api/session";

// Espejo del guard invertido de js/login.js: si ya hay sesion, /login
// redirige directo a /app en vez de mostrar el formulario de nuevo.
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  if (getToken()) return <Navigate to="/app" replace />;
  return children;
}
