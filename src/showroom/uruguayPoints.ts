import { toSvgPoints, URUGUAY_OUTLINE } from "../welcome/uruguayMap";

/**
 * El contorno del país en el mismo encuadre que el mapa del hero de la landing
 * (tile 43/74 a zoom 7; viewBox "20 260 760 640"). Es el fondo de la
 * simulación antes de que haya un resultado: un dibujo, no un mapa.
 */
export const uruguayPoints = toSvgPoints(URUGUAY_OUTLINE, 43, 74);
