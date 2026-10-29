// Los dibujos de la edición Halloween, sin lógica: SVG pintados con tokens
// (season-halloween.css). Quien los monta decide si hay temporada; ver
// HalloweenDecor.tsx. Todos aria-hidden: son adorno, no contenido.

const WEB_PATHS = [
  "M0 0L160 0",
  "M0 0L152.2 49.4",
  "M0 0L126.1 98.5",
  "M0 0L84.8 135.7",
  "M0 0L38.7 155.2",
  "M0 0L0 160",
  "M30 0Q24.3 3.8 28.5 9.3Q21.7 11.5 23.6 18.5Q16.5 18.3 15.9 25.4Q9.6 22.6 7.3 29.1Q3 24.4 0 30",
  "M60 0Q48.6 7.7 57.1 18.5Q43.4 23.1 47.3 36.9Q32.9 36.6 31.8 50.9Q19.2 45.3 14.5 58.2Q6 48.8 0 60",
  "M90 0Q72.9 11.5 85.6 27.8Q65.2 34.6 70.9 55.4Q49.4 54.8 47.7 76.3Q28.8 67.9 21.8 87.3Q9 73.2 0 90",
  "M120 0Q97.2 15.4 114.1 37.1Q86.9 46.2 94.6 73.9Q65.8 73.1 63.6 101.8Q38.4 90.6 29 116.4Q12 97.7 0 120",
  "M150 0Q121.5 19.2 142.7 46.4Q108.6 57.7 118.2 92.3Q82.3 91.4 79.5 127.2Q48.1 113.2 36.3 145.5Q15 122.1 0 150",
];

export function CobwebArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--hw-web)" strokeWidth="1">
        {WEB_PATHS.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}

export function MoonArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="hw-moon-glow">
          <stop offset="55%" stopColor="var(--hw-moon-glow)" />
          <stop offset="100%" stopColor="rgba(243, 230, 196, 0)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#hw-moon-glow)" />
      <circle cx="100" cy="100" r="54" fill="var(--hw-moon)" />
      <g fill="#000">
        <circle cx="82" cy="86" r="10" opacity="0.06" />
        <circle cx="118" cy="114" r="14" opacity="0.05" />
        <circle cx="112" cy="78" r="5" opacity="0.06" />
        <circle cx="84" cy="122" r="6" opacity="0.05" />
      </g>
    </svg>
  );
}

/** Murciélago con las alas cortadas en zigzag de rayo. */
export function BatArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 32" aria-hidden="true" focusable="false">
      <g fill="var(--hw-bat)">
        <path d="M29 15 19 5l2 7.5L11 8.5l3.5 8L4 15.5l9 8 7.5-4 8.5 1.5ZM35 15 45 5l-2 7.5 10-4-3.5 8 10.5-1-9 8-7.5-4-8.5 1.5Z" />
        <ellipse cx="32" cy="17" rx="4.2" ry="6.2" />
        <path d="m28.6 12.4.4-4 2 2.6ZM35.4 12.4 35 8.4l-2 2.6Z" />
      </g>
      <circle cx="30.5" cy="14.6" r="0.9" fill="var(--hw-moon)" />
      <circle cx="33.5" cy="14.6" r="0.9" fill="var(--hw-moon)" />
    </svg>
  );
}

/** Calabaza con un rayo tallado. El naranja es de la calabaza: nunca junto a un aviso. */
export function PumpkinArt({ className, size }: { className?: string; size: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M31 14c0-4 1.5-7 5-8.5"
        fill="none"
        stroke="var(--accent-astar-dim)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g fill="var(--warn)">
        <ellipse cx="20" cy="37" rx="14" ry="20" />
        <ellipse cx="44" cy="37" rx="14" ry="20" />
        <ellipse cx="32" cy="37" rx="13" ry="21" />
      </g>
      <path
        d="M22 19c-4 9-4 27 0 36M42 19c4 9 4 27 0 36"
        fill="none"
        stroke="var(--accent-dijkstra-dim)"
        strokeWidth="1.6"
        opacity="0.7"
      />
      <path
        d="M34.5 24 25 39h6.5l-3 12 11-16.5H33l3.5-10.5Z"
        fill="var(--hw-candle)"
        stroke="var(--on-warn)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15 31.5 20 29l2.5 4.5ZM49 31.5 44 29l-2.5 4.5Z" fill="var(--on-warn)" />
    </svg>
  );
}

/** Fantasmita con el cable enchufado. El cable es neutro: no sugiere "cargando" ni "OK". */
export function GhostArt({ className, width }: { className?: string; width: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 80"
      width={width}
      height={(width * 80) / 96}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M50 60c10 0 12 10 22 10h8"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect x="80" y="63" width="9" height="14" rx="2.5" fill="var(--text-muted)" />
      <path d="M89 66h4M89 74h4" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M14 34C14 18 22 8 33 8s19 10 19 26v28l-4.8-4-4.8 5-4.8-5-4.8 5-4.8-5-4.8 5-4.8-5L14 62Z"
        fill="var(--text)"
      />
      <ellipse cx="27" cy="31" rx="3" ry="4" fill="var(--bg-panel)" />
      <ellipse cx="39" cy="31" rx="3" ry="4" fill="var(--bg-panel)" />
      <path
        d="M28.5 41c2.6 2.4 6.4 2.4 9 0"
        fill="none"
        stroke="var(--bg-panel)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="22" cy="38.5" rx="3" ry="1.8" fill="var(--point-dest)" opacity="0.35" />
      <ellipse cx="44" cy="38.5" rx="3" ry="1.8" fill="var(--point-dest)" opacity="0.35" />
    </svg>
  );
}

export function WitchHatArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 22" aria-hidden="true" focusable="false">
      <path
        d="M5 16.5 13 2.5c.6-1 1.6-.9 1.9.2l3.4 13.8Z"
        fill="var(--border-strong)"
        stroke="var(--text-muted)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M7.4 12.3h10l.9 3.6H5.6Z" fill="var(--accent-astar)" />
      <ellipse
        cx="14"
        cy="17.5"
        rx="13"
        ry="3.3"
        fill="var(--border-strong)"
        stroke="var(--text-muted)"
        strokeWidth="1"
      />
    </svg>
  );
}
