/**
 * Íconos del showroom que no tienen el panel de /app ni la landing (los demás
 * se importan de map/panelIcons y landing/landingIcons). Mismo trazo: 1.6,
 * extremos redondeados.
 */

interface IconProps {
  size?: number;
}

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

/** La etiqueta "IA": un destello, no un robot ni un cerebro. */
export function IconSpark({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </svg>
  );
}

export function IconExternal({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function IconChevronLeft({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconXCircle({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

export function IconInfo({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 15.5v.1" />
    </svg>
  );
}

/** Silueta de trazo para el auto sin foto: dice "no hay foto" sin inventar una. */
export function CarOutline({ width = 64 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 64 40"
      width={width}
      height={(width * 40) / 64}
      fill="none"
      stroke="currentColor"
      strokeWidth={width > 80 ? 1.2 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 28v-6l6-2 8-9h20l10 9 8 2v6h-4" />
      <path d="M16 28h28" />
      <circle cx="12" cy="29" r="4" />
      <circle cx="48" cy="29" r="4" />
    </svg>
  );
}
