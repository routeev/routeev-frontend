/**
 * Íconos del login. Mismo trazo que los de la landing y el panel de /app:
 * 1.6, extremos redondeados. Inline y sin librería.
 */

function svgProps(size: number, strokeWidth = 1.6) {
  return {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
}

export function IconArrowLeft() {
  return (
    <svg {...svgProps(16)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg {...svgProps(18)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/** Error: círculo con "!". */
export function IconAlert({ size = 18 }: { size?: number }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  );
}

/** Información: círculo con "i". */
export function IconInfo() {
  return (
    <svg {...svgProps(18)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </svg>
  );
}

/** Código reenviado: un sobre. */
export function IconMail() {
  return (
    <svg {...svgProps(18)}>
      <path d="M4 7l8 6 8-6" />
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
    </svg>
  );
}

export function IconEye() {
  return (
    <svg {...svgProps(20)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff() {
  return (
    <svg {...svgProps(20)}>
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-2.6 3.4M6.2 7.2C3.9 8.8 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" />
    </svg>
  );
}

/** Requisito cumplido. */
export function IconCheck() {
  return (
    <svg {...svgProps(16, 1.8)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Requisito todavía no cumplido: círculo vacío. */
export function IconCircle() {
  return (
    <svg {...svgProps(16)}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function IconClock() {
  return (
    <svg {...svgProps(16)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconResend() {
  return (
    <svg {...svgProps(17)}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
    </svg>
  );
}
