/** Clave de React Query de la galería de una estación (ver StationPhotos.tsx). Aparte para que StationReviews la invalide sin importar el componente. */
export function stationPhotosQueryKey(nodeId: string) {
  return ["stationPhotos", nodeId] as const;
}
