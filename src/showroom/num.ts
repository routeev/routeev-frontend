/** Formato es-UY de números planos, portado de num() en js/showroom.js. */
export function num(value: number, decimales = 0): string {
  return Number(value).toLocaleString("es-UY", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
