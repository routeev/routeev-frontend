/**
 * Punto de entrada de la pantalla principal (mapa Leaflet con el grafo real
 * de Montevideo, seleccion de origen/destino, gestion de vehiculos, calculo
 * de ruta y dashboard comparativo Dijkstra vs A*). La logica en si vive
 * repartida en modulos bajo ./map/ (ver ese directorio); este archivo es
 * solo el guard de sesion.
 *
 * El guard tiene que correr ANTES que cualquier otra cosa -- sin crear el
 * mapa Leaflet, sin consultar el DOM de la app, sin pedir nada al backend --
 * si no hay sesion. Un import ESTATICO de ./map/main.js se evaluaria de
 * entrada, antes de este chequeo (las declaraciones import se izan al tope
 * del modulo); el import() DINAMICO es perezoso, asi que el resto de la app
 * recien se carga si el guard lo deja pasar.
 */
if (!getToken()) {
  window.location.href = "/login";
} else {
  import("./map/main.js");
}
