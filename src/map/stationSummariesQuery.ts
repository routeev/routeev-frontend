import { listStationReviewSummaries } from "../api/stationReviews";

/**
 * El resumen de reseñas de todas las estaciones (promedio y cantidad). Lo leen
 * la capa del mapa, la lista y la ficha: con la misma key es una sola request.
 *
 * staleTime de un minuto: sin esto se volvía a pedir cada vez que se abría una
 * ficha o la pestaña de estaciones, y cada vez que la pestaña del navegador
 * recuperaba el foco (en el celular, cada vuelta desde otra app). Es un
 * agregado público, no depende de la sesión, y dejar una reseña lo invalida
 * (StationReviews.tsx), así que la propia sigue apareciendo al instante.
 */
export const stationSummariesQuery = {
  queryKey: ["stationReviewSummaries"],
  queryFn: listStationReviewSummaries,
  staleTime: 60_000,
} as const;
