export const shared = {
  uruguayGraph: {
    mapAriaLabel:
      "Mapa de Uruguay con las 19 capitales departamentales y una ruta de ejemplo entre Montevideo y Rivera, con una parada de carga en Tacuarembó",
  },
  routeErrorBoundary: {
    staleChunkTitle: "Hay una versión nueva de la app",
    genericTitle: "Algo salió mal",
    staleChunkBody: "Recargá la página para actualizar a la última versión.",
    genericBody: "Recargá la página. Si el problema sigue, probá de nuevo en unos minutos.",
    reload: "Recargar",
  },
  modelCombobox: {
    searching: "Buscando en el catálogo...",
    minChars: (minChars: number) => `Escribí al menos ${minChars} letras para buscar en el catálogo.`,
    noMatches: "Ningún modelo del catálogo coincide. Igual podés completar los datos a mano.",
  },
  siteFooter: {
    showroom: "Showroom",
    privacy: "Privacidad",
    terms: "Términos",
    contact: "Escribinos",
    instagram: "Seguinos en Instagram",
    copyright: (year: number) => `© ${year} RouteEV. Todos los derechos reservados.`,
  },
  toastViewport: {
    dismiss: "Cerrar este aviso",
  },
  certaintyLine: {
    infeasibleAriaLabel: "Perfil de batería del viaje: no es factible con este vehículo",
    feasibleAriaLabel: "Perfil de batería a lo largo del viaje",
  },
};
