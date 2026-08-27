// Zoom usado al centrar el mapa en la ubicacion real del usuario (auto-locate
// al abrir /app en MapCanvas, y al volver del detalle de una estacion en
// StationDetailPanel/StationsLayer). Vive en su propio archivo -- no
// exportado desde MapCanvas.tsx -- porque StationsLayer ya es importado POR
// MapCanvas.tsx; importar de vuelta desde ahi crearia un ciclo.
export const AUTO_LOCATE_ZOOM = 15;
