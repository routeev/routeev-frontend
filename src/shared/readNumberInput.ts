import type { ChangeEvent } from "react";

/**
 * onChange helper for a controlled `<input type="number">` bound directly to
 * a numeric (not string) piece of state.
 *
 * React only rewrites a number input's DOM value when `element.value !=
 * value` -- a *loose* comparison (see react-dom's `updateInput`). Typing "0"
 * then "6" then "8" makes the DOM read "068", but `"068" != 68` coerces to
 * `68 != 68`, which is false, so React skips the write and the stale "068"
 * stays on screen even though state is correctly 68. Stripping the leading
 * zeros ourselves and writing `e.target.value` immediately sidesteps that
 * skip instead of waiting on a DOM write React won't do.
 *
 * Only strips *leading* zeros on an otherwise-unsigned digit string -- fine
 * for the `min={0}`-style percent fields this is built for, but a leading
 * "-" (e.g. "-068") passes through untouched. Don't reach for this on a
 * field that allows negative values without extending the regex first.
 */
export function readNumberInput(e: ChangeEvent<HTMLInputElement>): number {
  const stripped = e.target.value.replace(/^0+(?=\d)/, "") || "0";
  e.target.value = stripped;
  return Number(stripped);
}
