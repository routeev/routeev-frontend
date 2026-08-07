import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../api/session";

// Centraliza el guard que hoy esta repetido a mano en map.js/profile.js
// (front2.md 1.5 y Parte 2 "React Router"): sin token, redirige a /login.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}
