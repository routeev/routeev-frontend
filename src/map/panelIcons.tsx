/**
 * Íconos del panel de /app: trazo de 1.6, extremos redondeados, 18 px por
 * defecto. Inline y sin librería, mismo criterio que landing/landingIcons.tsx;
 * el tamaño se pisa con `size` donde el diseño pide 16, 20 o 22.
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

export function IconRoute({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="6" cy="18" r="2.2" />
      <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
      <path d="M16 3.5l3 2.5-3 2.5" />
    </svg>
  );
}

export function IconBolt({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />
    </svg>
  );
}

/** Rayo relleno, para el círculo del estado "Disponible". */
export function IconBoltFilled({ size = 12 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />
    </svg>
  );
}

export function IconPin({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

/** Mira: el estado "apretado" de la chincheta cambia de forma, no solo de color. */
export function IconCrosshair({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    </svg>
  );
}

export function IconSwap({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M8 20V4M8 4L5 7M8 4l3 3M16 4v16M16 20l-3-3M16 20l3-3" />
    </svg>
  );
}

export function IconLocate({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </svg>
  );
}

export function IconCheck({ size = 16, strokeWidth = 1.8 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg {...svgProps(size, strokeWidth)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconAlert({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  );
}

export function IconBlocked({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function IconRetry({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

export function IconSearch({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  );
}

export function IconCar({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 16.5V12l1.9-4.6A2 2 0 0 1 7.7 6.2h8.6a2 2 0 0 1 1.8 1.2L20 12v4.5H4z" />
      <path d="M4 12h16M6 16.5V19M18 16.5V19" />
    </svg>
  );
}

export function IconChevronDown({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconPlus({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconBack({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconPlug({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0z" />
      <path d="M12 16v5" />
    </svg>
  );
}

export function IconCamera({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function IconEdit({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  );
}

export function IconClose({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconClock({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/** Flecha de navegación rellena (Iniciar viaje, Ir hasta acá). */
export function IconNavigate({ size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3l7 18-7-4-7 4z" />
    </svg>
  );
}

export const STAR_PATH =
  "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z";
