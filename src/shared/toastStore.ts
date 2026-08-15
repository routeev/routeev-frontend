import { create } from "zustand";

export type ToastVariant = "ok" | "error";

export interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
  /** ms hasta que se va solo. */
  duration: number;
}

/**
 * Los errores duran bastante más que las confirmaciones, y no por gusto: una
 * confirmación que se pierde no cuesta nada (el resultado ya quedó en
 * pantalla: el vehículo aparece en la grilla, el nombre nuevo en el chip),
 * pero un error que se desvanece antes de terminar de leerlo deja a la
 * persona reintentando a ciegas la misma acción que ya falló. El feedback que
 * originó todo esto era justamente de alguien mayor, que lee sin apuro.
 */
const DURACION_MS: Record<ToastVariant, number> = { ok: 5000, error: 10000 };

let nextId = 1;

interface ToastState {
  toasts: Toast[];
  push: (variant: ToastVariant, message: string) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (variant, message) =>
    set((s) => {
      // Dos clicks seguidos en "Guardar" (el mismo doble disparo que este
      // sistema viene a evitar) no tienen que apilar dos avisos idénticos uno
      // arriba del otro: se ignora el repetido mientras el primero siga visible.
      if (s.toasts.some((t) => t.variant === variant && t.message === message)) return s;
      return {
        toasts: [...s.toasts, { id: nextId++, variant, message, duration: DURACION_MS[variant] }],
      };
    }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Atajo para avisar el resultado de una acción desde cualquier lado --
 * incluido el onSuccess/onError de una mutación de TanStack Query, que no es
 * un componente y por lo tanto no puede consumir un contexto de React. De ahí
 * que el estado viva en un store de zustand (el mismo patrón que mapStore) y
 * no en un <ToastProvider>: no hace falta envolver nada para poder avisar.
 */
export const toast = {
  ok: (message: string) => useToastStore.getState().push("ok", message),
  error: (message: string) => useToastStore.getState().push("error", message),
};
