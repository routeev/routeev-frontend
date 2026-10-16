/**
 * Íconos del perfil que no tienen el panel de /app ni la landing (los demás
 * se importan de map/panelIcons). Mismo trazo: 1.6, extremos redondeados.
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

/** "⋯" de la tarjeta de un auto (escritorio). */
export function IconDots({ size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </svg>
  );
}

/** "⋮" de la fila de un auto (celular). */
export function IconDotsVertical({ size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </svg>
  );
}

export function IconImageOff({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 5l16 14" />
    </svg>
  );
}

export function IconTrash({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5" />
    </svg>
  );
}

export function IconPencil({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function IconMail({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 7l8 6 8-6" />
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
    </svg>
  );
}

export function IconWarning({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3.5L2.5 20h19z" />
      <path d="M12 10v4.5M12 17.2v.01" />
    </svg>
  );
}

/** "Ver en el mapa": un mapa plegado. */
export function IconMap({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  );
}

/** Viaje sin ruta: círculo tachado. */
export function IconNoRoute({ size = 14 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 8.5l7 7" />
    </svg>
  );
}

export function IconExternal({ size = 11 }: IconProps) {
  return (
    <svg {...svgProps(size, 2)}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

// Índice de secciones.

export function IconSectionCars({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 15v-3l2.5-1 3-4.5h7L20 11l1 1v3h-2M7 15h10M7 15a2 2 0 1 1-4 0M21 15a2 2 0 1 1-4 0" />
    </svg>
  );
}

export function IconSectionTrips({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 19V9M10 19V5M16 19v-7M21 19H3" />
    </svg>
  );
}

export function IconSectionAccount({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
