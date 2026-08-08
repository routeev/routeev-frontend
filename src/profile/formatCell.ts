/** Portado de fmt() en js/profile.js: null/undefined se muestran como "-". */
export function fmt(value: number | null | undefined, digits: number, suffix = ""): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(digits) + suffix;
}
