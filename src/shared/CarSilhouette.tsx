// Portado de js/car-art.js: sin foto de stock (no la hay para 632 modelos),
// cada auto sin foto recibe una silueta con un color derivado de su nombre
// -- mismo nombre, mismo color siempre, asi las tarjetas se distinguen entre
// si de un vistazo. Compartido por el showroom y (mas adelante) los
// vehiculos del perfil.

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 62%, 58%)`;
}

interface CarSilhouetteProps {
  name: string;
  className?: string;
}

export function CarSilhouette({ name, className }: CarSilhouetteProps) {
  const color = colorFromName(name);
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
      <path
        d="M6 22h52v-5c0-2-1.5-3.5-3.5-4l-7-1-6-6c-1-1-2.3-1.5-3.7-1.5H24c-1.4 0-2.7.5-3.7 1.5l-6 6-7 1C5.5 13.5 4 15 4 17v5h2z"
        fill={color}
        opacity="0.85"
      />
      <path
        d="M22 7h9v5H17l5-5zm11 0h5.5c.8 0 1.5.3 2 .9L44 12H33V7z"
        fill="#0d1117"
        opacity="0.55"
      />
      <circle cx="17" cy="23" r="4.5" fill="#0d1117" stroke={color} strokeWidth="2" />
      <circle cx="47" cy="23" r="4.5" fill="#0d1117" stroke={color} strokeWidth="2" />
    </svg>
  );
}
