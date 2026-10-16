import type { Lang } from "../i18n/LanguageProvider";

// PENDIENTE: la ficha real de la app en el App Store. Mientras no esté, el
// badge lleva a la portada de la tienda en vez de a un link roto.
export const APP_STORE_URL = "https://apps.apple.com/";
// Sin ?hl=: Google Play elige el idioma según quien la abre.
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=uy.routeev.movil";

/** El QR de las dos pantallas que ofrecen la app (bienvenida y landing). */
export const STORE_QR_SRC = "/img/qr-bienvenida.svg";

export interface BadgeImage {
  src: string;
  width: number;
  height: number;
}

// Badges oficiales sin tocar, servidos desde public/img/badges. Los de
// Google Play vienen sin el margen transparente del PNG original, para que
// a la misma altura se vean del mismo tamaño que el de App Store.
export const BADGES: Record<Lang, { appStore: BadgeImage; googlePlay: BadgeImage }> = {
  es: {
    appStore: { src: "/img/badges/app-store-es.svg", width: 120, height: 40 },
    googlePlay: { src: "/img/badges/google-play-es.png", width: 646, height: 192 },
  },
  en: {
    appStore: { src: "/img/badges/app-store-en.svg", width: 120, height: 40 },
    googlePlay: { src: "/img/badges/google-play-en.png", width: 564, height: 168 },
  },
};

export type MobileOs = "ios" | "android";

/**
 * Qué tienda se muestra primero en mobile. Cualquier cosa que no diga
 * Android cae en iOS: en desktop no se usa (ahí van los dos badges), y en un
 * celular que no es ni uno ni otro no hay una respuesta mejor.
 */
export function detectMobileOs(userAgent: string): MobileOs {
  return /android/i.test(userAgent) ? "android" : "ios";
}
