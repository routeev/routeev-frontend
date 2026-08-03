/**
 * Silueta de auto para cuando no hay foto.
 *
 * No hay fotos de stock propias para los 880 modelos del catalogo, y una
 * foto generica que no es el auto de nadie es peor que ninguna. En vez de
 * eso, cada auto sin foto recibe una silueta con un color derivado de su
 * nombre: el mismo nombre da siempre el mismo color, asi que las tarjetas se
 * distinguen entre si de un vistazo.
 *
 * Lo comparten el perfil (vehiculos del usuario, hasta que sube una foto
 * real de SU auto) y el showroom (mientras se busca la foto del modelo, y si
 * no aparece ninguna).
 */

function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 62%, 58%)`;
}

function carSvg(name) {
  const color = colorFromName(name);
  // Dibujada a mano en SVG: sin dependencias, sin pedidos de red, y escala
  // sin perder nitidez.
  return `
      <svg viewBox="0 0 64 32" class="vehicle-art" aria-hidden="true">
        <path d="M6 22h52v-5c0-2-1.5-3.5-3.5-4l-7-1-6-6c-1-1-2.3-1.5-3.7-1.5H24c-1.4 0-2.7.5-3.7 1.5l-6 6-7 1C5.5 13.5 4 15 4 17v5h2z"
              fill="${color}" opacity="0.85" />
        <path d="M22 7h9v5H17l5-5zm11 0h5.5c.8 0 1.5.3 2 .9L44 12H33V7z" fill="#0d1117" opacity="0.55" />
        <circle cx="17" cy="23" r="4.5" fill="#0d1117" stroke="${color}" stroke-width="2" />
        <circle cx="47" cy="23" r="4.5" fill="#0d1117" stroke="${color}" stroke-width="2" />
      </svg>`;
}
