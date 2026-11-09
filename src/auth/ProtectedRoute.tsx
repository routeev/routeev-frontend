import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../api/session";
import { renovarSesion } from "./renovarSesion";

// Centraliza el guard que hoy esta repetido a mano en map.js/profile.js
// (front2.md 1.5 y Parte 2 "React Router"): sin token, redirige a /login.
//
// Tambien renueva el token al entrar y al volver a la pestaña. Va aca y no en
// la raiz de la app a proposito: un 401 de la renovacion manda al login, y
// eso tiene sentido en /app y /profile, no en la landing o el showroom, que se
// usan sin cuenta.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const hayToken = Boolean(getToken());

  useEffect(() => {
    if (!hayToken) return;
    void renovarSesion();
    const alVolver = () => {
      if (document.visibilityState === "visible") void renovarSesion();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [hayToken]);

  if (!hayToken) return <Navigate to="/login" replace />;
  return children;
}
