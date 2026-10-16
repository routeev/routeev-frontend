/**
 * Íconos de la landing que no tiene el panel de /app (los demás se importan
 * de map/panelIcons, para que las dos pantallas dibujen igual el tilde, el
 * aviso o el auto). Mismo trazo: 1.6, extremos redondeados.
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

export function IconArrowRight({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, 1.8)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronRight({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconMenu({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconMonitor({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function IconPhone({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconInstagram({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r=".6" />
    </svg>
  );
}

// La cuenta y el tema, en el header de /app y /profile (HeaderAccount.tsx).

export function IconUser({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  );
}

export function IconLogout({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M9 12h11M16 8l4 4-4 4" />
    </svg>
  );
}

export function IconSun({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

export function IconMoon({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
