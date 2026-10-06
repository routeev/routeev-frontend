/**
 * El mapa de la simulación, cargado bajo demanda.
 *
 * SimulationMap arrastra leaflet, react-leaflet y -- por el mapa base vectorial
 * de BasemapLayer -- maplibre-gl: ~285 KB gzip de JS más ~18 KB gzip de CSS.
 * Importado de forma estática desde SimulationResult, el bundler lo dejaba en
 * el chunk de entrada de /showroom, o sea que abrir el showroom bajaba (y
 * bloqueaba el primer pintado con) las librerías de un mapa que no aparece
 * hasta que la persona corre una simulación. Con el import dinámico, la grilla
 * del showroom ya no paga por eso.
 *
 * Vive en su propio módulo para que lo compartan SimulationResult (React.lazy)
 * y SimulationForm (precarga): los dos llaman al mismo import(), y el
 * navegador lo resuelve una sola vez.
 */
export const cargarSimulationMap = () => import("./SimulationMap");
