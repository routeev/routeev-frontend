/**
 * Íconos chicos (18x18, trazo -- mismo criterio que .btn-icon en base.css)
 * para distinguir cada sección en los menúes móviles de SiteHeader y
 * AppTopbar. Inline y sin librería, mismo patrón que TripDashboard.tsx.
 */

const common = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconCar() {
  return (
    <svg {...common}>
      <path d="M7 11 9 7h6l2 4" />
      <rect x="3" y="11" width="18" height="5" rx="2" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </svg>
  );
}

export function IconInfo() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconChart() {
  return (
    <svg {...common}>
      <rect x="4" y="13" width="3.5" height="7" rx="0.5" />
      <rect x="10.25" y="9" width="3.5" height="11" rx="0.5" />
      <rect x="16.5" y="5" width="3.5" height="15" rx="0.5" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  );
}

export function IconMapPin() {
  return (
    <svg {...common}>
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg {...common}>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}
