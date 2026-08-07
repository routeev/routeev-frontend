import { useEffect, useRef, useState } from "react";

/** Porta el patrón de js/landing.js: revela una vez al entrar en viewport, con fallback si no hay IntersectionObserver. */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  // Sin IntersectionObserver (entorno viejo), arranca ya visible en vez de
  // setState-ear dentro del efecto (ver js/landing.js, mismo fallback).
  const [inView, setInView] = useState(() => !("IntersectionObserver" in window));

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, inView]);

  return { ref, inView };
}
