import { useQuery } from "@tanstack/react-query";
import { getStationStatus, type EstadoDeEstacion, type NodeId } from "../api/graph";

/**
 * Cada cuánto se vuelve a preguntar por el estado.
 *
 * Dos ritmos distintos a propósito. Cuando hay estado, 3 minutos: el backend
 * cachea la fuente 5 minutos (UTE_ESTADO_TTL_S), así que preguntar más seguido
 * devuelve lo mismo, y preguntar mucho menos haría que el chip diga "hace un
 * rato" cuando ya pasó bastante más.
 *
 * Cuando NO hay estado -- que hoy es siempre, porque el feed de UTE devuelve
 * una constante -- 20 minutos. Reintentar cada 3 minutos algo que lleva meses
 * roto es ruido en el log de todos y tráfico contra un endpoint ajeno para
 * nada. Sigue reintentando, porque el día que UTE lo arregle esto se tiene que
 * encender solo.
 */
const CADA_3_MIN = 3 * 60 * 1000;
const CADA_20_MIN = 20 * 60 * 1000;

/**
 * Estado en vivo de las estaciones, o null cuando no hay.
 *
 * `null` no es un caso de borde: es el caso normal hoy. Todo consumidor tiene
 * que estar escrito para no mostrar nada, no para mostrar un "desconocido".
 */
export function useStationStatus() {
  const query = useQuery({
    queryKey: ["stationStatus"],
    queryFn: getStationStatus,
    refetchInterval: (q) => (q.state.data?.disponible ? CADA_3_MIN : CADA_20_MIN),
    // Que falle no es un problema del mapa: la fuente es de terceros y el
    // resto de la pantalla no depende de esto.
    retry: 1,
  });

  const datos = query.data?.disponible ? query.data : null;

  function estadoDe(nodeId: NodeId): EstadoDeEstacion | null {
    return datos?.estados[nodeId] ?? null;
  }

  return { datos, estadoDe };
}
