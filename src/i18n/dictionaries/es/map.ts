export const map = {
  replay: {
    suffix: (date: string) => ` · viaje del ${date}`,
  },
  tripDashboard: {
    // El nombre del modo sale de routeInput.routeMode (el mismo que se eligió);
    // acá va solo qué significó para ESTA ruta.
    tripMode: {
      label: "Tipo de viaje",
      eficiente: "Equilibra el tiempo con el gasto de batería.",
      rapido: "Prioriza llegar antes, aunque gaste más batería.",
      economico: "Prioriza gastar menos plata en las recargas.",
    },
    margin: {
      noPlanFallback:
        " No hay plan de cargas que respete ese margen en este viaje: se muestra la mejor ruta posible.",
      reserveApplied: (pct: string) =>
        ` Como dijiste que en el destino no tenés dónde cargar, el viaje se calculó guardando un ${pct}% para que puedas llegar hasta un cargador.`,
      reserveNotEnough:
        " Tampoco alcanza para llegar hasta un cargador después de llegar: revisá si vas a poder cargar antes.",
    },
    destinationCharger: {
      distance: (km: string) => `a ${km} km en línea recta del destino`,
      tooFar: "Está lejos como para contar con él: fijate si vas a poder cargar antes de llegar.",
    },
    cost: {
      tollsNoAmount: "sin monto conocido",
      tollsPartialAmount: (amount: string) => `${amount} y otros sin monto conocido`,
    },
    stopCard: {
      occupationValue: (price: string, min: number) => `$ ${price}/min pasados ${min} min`,
      backupValue: (name: string, km: number, tooFar: boolean) =>
        `${name} a ${km} km${tooFar ? " — sin respaldo cerca" : ""}`,
      poiParadaLarga: "para una parada más larga",
      poiDist: (m: number) => `a ${m} m`,
      poiCategoria: {
        cafe_kiosco: "Café / kiosco",
        bano: "Baño",
        farmacia: "Farmacia",
        comida_rapida: "Comida rápida",
        comida: "Para comer",
        compras: "Supermercado",
      },
    },
    startTrip: "Iniciar viaje",
    startTripAgain: "Iniciar viaje de nuevo",
    cancelTrip: "Cancelar viaje",
    cancelPlan: "Cancelar",
    live: {
      gpsDebug: (accuracy: string, gap: string) => `GPS: precisión ±${accuracy}m · cada ${gap}s`,
      radarAlert: (name: string) => `Radar adelante: ${name}`,
      radarAlertWithSpeed: (name: string, maxspeed: number) =>
        `Radar adelante: ${name} (máx. ${maxspeed} km/h)`,
      radarVibration: "Vibrar al acercarme a un radar",
    },
  },
  // Panel lateral de /app: el armazón (pestañas, hoja inferior) y los textos
  // nuevos del rediseño. Lo que ya existía antes sigue en su sección de
  // siempre (routeInput, tripDashboard, stationReviews...).
  panel: {
    ariaLabel: "Panel del viaje",
    tabTrip: "Viaje",
    tabStations: "Estaciones",
    sheetPlan: "Planificá tu viaje",
    sheetSummary: (from: string, to: string, time: string) => `${from} → ${to} · ${time}`,
    plan: {
      chargeHelp: {
        none: "Cambia con cuánta batería necesitás llegar.",
        yes: "Podés llegar con menos batería, porque cargás allá.",
        no: "Te mostramos el cargador más cercano al destino y llegás con margen.",
      },
      vehicle: "Vehículo",
      changeVehicle: "Cambiar de vehículo",
      vehicleSub: (kwh: string, km: string) => `${kwh} kWh · ${km} km de autonomía`,
      batteryAtStart: "Batería al salir",
      range: (km: string) => `≈ ${km} km de autonomía`,
      levels: { high: "Alta", mid: "Media", low: "Baja" },
      less: "Bajar 5 %",
      more: "Subir 5 %",
      noVehicleTitle: "Todavía no cargaste ningún auto",
      noVehicleBody: "Elegilo entre 328 modelos en tu perfil. Es un minuto.",
      calculating: "Calculando ruta…",
      calculatingNote: "Buscando paradas de carga en el camino.",
      calculatingSlow: "Está tardando más de lo normal. Seguimos calculando.",
      retry: "Reintentar",
    },
    stations: {
      search: "Buscar por nombre o ciudad",
      filters: { all: "Todas", fast: "Rápidas · 50 kW o más", ute: "UTE", priv: "Privadas" },
      count: (n: number) =>
        `${n} ${n === 1 ? "estación" : "estaciones"} · red de UTE y operadores privados`,
      privateTag: "Privada",
      noMatch: (q: string) => `No hay estaciones que coincidan con «${q}».`,
      noMatchFilter: "No hay estaciones con ese filtro.",
      loadFailedTitle: "No pudimos cargar las estaciones",
      loadFailedBody: "Podés seguir planificando el viaje. Probá de nuevo en unos segundos.",
      loading: "Cargando estaciones…",
      back: "Estaciones",
      maxPower: "potencia máx.",
      connectors: "conectores",
      rating: "calificación",
      note: "Nota",
      reportTitle: "Reportar estado",
      reportQuestion: "¿Cómo está ahora?",
      reportFirst: "Todavía no hay reportes. Sé el primero.",
      sendReport: "Enviar reporte",
      reportThanks: "Gracias. Ya lo ven los demás.",
      reviews: "Reseñas",
      reviewCount: (n: number) => (n === 1 ? "1 reseña" : `${n} reseñas`),
      noReviewsTitle: "Todavía no hay reseñas",
      noReviewsBody: "Contá cómo te fue y ayudá al próximo.",
    },
    trip: {
      yourTrip: "Tu viaje",
      edit: "Editar",
      arriveWith: "Llegás con",
      tone: { ok: "Con margen", low: "Margen bajo", crit: "Crítico" },
      advice: {
        ok: "Llegás con batería de sobra para moverte allá.",
        low: "Llegás con poco margen. Manejá a 90 km/h o menos para no quedarte corto.",
        crit: "Llegás casi sin batería. Salí con más carga o elegí «Lo antes posible» para sumar una parada.",
      },
      time: "Tiempo estimado",
      cost: "Costo estimado",
      timeParts: { driving: "Manejo", traffic: "Tráfico", charging: "Carga" },
      costParts: {
        home: "Energía en casa",
        energy: "Energía",
        recharges: "Recargas",
        tolls: "Peajes",
      },
      withoutTariff: (n: number) => `${n} ${n === 1 ? "recarga" : "recargas"} sin tarifario`,
      distance: "Distancia",
      avgSpeed: "Vel. promedio",
      batteryUsed: "Batería usada",
      stops: "Paradas",
      tolls: "Peajes",
      noTolls: "Sin peajes",
      destinationCharger: "Cargador más cercano al destino",
      stopsTitle: (n: number) => (n ? `Paradas de carga · ${n}` : "Paradas de carga"),
      stopAdd: "Cargás",
      stopTime: "Tiempo",
      stopCost: "Costo",
      noRate: "Sin tarifa",
      charger: "Cargador",
      fee: "Ocupación",
      backup: "Respaldo",
      nearby: "Cerca a pie",
      noStops: "No necesitás parar a cargar en este viaje.",
      noRouteTitle: "No encontramos una ruta",
      noRouteBody: (pct: number) =>
        `Con ${pct} % de batería al salir no hay una combinación de cargadores que te lleve hasta el destino.`,
      noRouteTips: [
        "Salí con más batería.",
        "Probá con «Lo antes posible»: busca cargadores más cerca.",
      ],
      editTrip: "Editar viaje",
      live: "En viaje",
      traveled: "Recorrido",
      battery: "Batería",
      elapsed: "Tiempo",
      speed: "Velocidad",
      of: (km: string) => `de ${km} km`,
    },
  },
  page: {
    title: "RouteEV · Mapa",
    showPanel: "Mostrar panel",
    hidePanel: "Ocultar panel",
    loadFailed: (failed: string) =>
      `No se pudo cargar: ${failed}. Revisá tu conexión y volvé a intentar.`,
    tapToMark: (role: "origin" | "destination") =>
      `Tocá el mapa para marcar ${role === "origin" ? "el origen" : "el destino"}`,
    cancel: "Cancelar",
    calculateRoute: "Calcular ruta",
    readyToCalculate: "Listo para calcular.",
  },
  liveTrip: {
    saveFailed:
      "El viaje no se pudo guardar en el historial. Los datos del recorrido se perdieron.",
    saveNoPlan:
      "Este recorrido es de un viaje ya guardado. Volvé a calcular la ruta para poder registrar uno nuevo.",
    arrived: "Llegaste a destino",
    offRoute: (km: string) =>
      `Estás a ${km} km de la ruta calculada: el progreso no se puede seguir hasta que estés sobre ella.`,
    passedStation: (name: string) => `Pasaste por ${name}: batería actualizada`,
    driftedFromRoute: "Te alejaste de la ruta calculada",
    onRoute: "En ruta...",
    permissionDenied:
      "Permiso de ubicación denegado: activalo en la configuración del navegador para seguir el viaje en vivo.",
    searchingGps: "Buscando señal de GPS...",
    locationUnavailable: "No se pudo obtener tu ubicación por el momento.",
    unsupportedBrowser:
      "Tu navegador no soporta geolocalización: no se puede seguir el viaje en vivo.",
    insecureContext: "El seguimiento en vivo necesita una conexión segura (HTTPS).",
    searchingLocation: "Buscando tu ubicación...",
    tooFarFromOrigin: (km: string) =>
      `No se puede iniciar el viaje: estás a ${km} km del origen de la ruta. Acercate al origen, o recalculá la ruta desde donde estás ahora (podés usar "Usar mi ubicación como origen").`,
  },
  stationReviews: {
    loading: "Cargando reseñas...",
    loadError: "No se pudieron cargar las reseñas de esta estación.",
    starsRequired: "Elegí una cantidad de estrellas.",
    saveError: "No se pudo guardar la reseña.",
    deleteError: "No se pudo borrar la reseña.",
    uploadPhotoError: "No se pudo subir la foto.",
    removePhotoError: "No se pudo quitar la foto.",
    yourReview: "Tu reseña",
    writeReview: "Dejá tu reseña",
    commentPlaceholder: "¿Cómo fue tu experiencia en esta estación? (opcional)",
    removePhoto: "Quitar foto",
    changePhoto: "Cambiar foto",
    addPhoto: "Agregar foto",
    saving: "Guardando...",
    update: "Actualizar",
    publish: "Publicar",
    delete: "Borrar",
  },
  stationPhotos: {
    title: "Fotos",
    loadError: "No se pudieron cargar las fotos.",
    add: "Agregar foto",
    adding: "Subiendo...",
    emptyHint:
      "Todavía no hay fotos. Subí una del cargador para que otros lo encuentren más fácil.",
    limitReached: "Ya subiste el máximo de fotos de esta estación. Borrá una para subir otra.",
    uploadError: "No se pudo subir la foto.",
    deleteError: "No se pudo borrar la foto.",
    reportError: "No se pudo enviar el reporte.",
    open: (n: number, total: number) => `Ver foto ${n} de ${total}`,
    by: (autor: string) => `Foto de ${autor}`,
    fromReview: "De una reseña",
    streetView: "Vista de la calle",
    close: "Cerrar",
    previous: "Anterior",
    next: "Siguiente",
    delete: "Borrar foto",
    confirmDelete: "¿Borrar esta foto?",
    report: "Reportar",
    reportTitle: "¿Qué tiene esta foto?",
    reportReasons: {
      inapropiada: "Contenido inapropiado",
      no_es_el_lugar: "No es este cargador",
      datos_personales: "Se ven datos personales (caras, matrículas)",
      otro: "Otro problema",
    },
    sendReport: "Enviar reporte",
    reported: "Gracias. La vamos a revisar.",
    cancel: "Cancelar",
  },
  stationStatusReport: {
    funciona: "Funciona",
    ocupado: "Ocupado",
    noFunciona: "No funciona",
    enviando: "Enviando...",
    sendError: "No se pudo enviar el reporte.",
    reporte: (estado: string, cuando: string) => `${estado} · ${cuando}`,
    haceMin: (minutos: number) => `hace ${minutos} min`,
    haceHoras: (horas: number) => `hace ${horas} h`,
    reciente: "recién",
  },
  routeAutocomplete: {
    originLabel: "Origen",
    destinationLabel: "Destino",
    roleLabel: (role: "origin" | "destination"): string =>
      role === "origin" ? "origen" : "destino",
    searching: "Buscando...",
    // Qué es cada sugerencia (ver map/lugares.ts).
    kindDepartment: "Departamento",
    kindCity: "Ciudad",
    kindStreet: "Calle",
    departmentHint: (capital: string) => `Vas a ${capital}, la capital`,
    capitalOf: (departamento: string) => `Capital de ${departamento}`,
    streetHint: "Cruce de calles",
    departmentValue: (departamento: string) => `Departamento de ${departamento}`,
    cityValue: (nombre: string, departamento: string) =>
      nombre === departamento ? `${nombre} (ciudad)` : `${nombre}, ${departamento}`,
    departmentChosen: (capital: string) =>
      `Se usa el centro de ${capital}, la capital del departamento.`,
    addressFound: (address: string) => `Encontrado: ${address}`,
    addressImprecise: (km: string) =>
      ` (a ${km} km de la calle más cercana del grafo cubierto -- puede no ser precisa)`,
    addressSearchError: "No se pudo buscar esa dirección.",
    keepTyping: "Seguí escribiendo para buscar...",
    searchAsAddress: (label: string) => `Buscar «${label}» como dirección completa`,
    clearRole: (roleLabel: string) => `Borrar el ${roleLabel}`,
    pickOnMapActive: (roleLabel: string) =>
      `Tocá el mapa para marcar el ${roleLabel}, o tocá acá para cancelar`,
    pickOnMap: (roleLabel: string) => `Marcar el ${roleLabel} tocando el mapa`,
    pickOnMapActiveSr: (roleLabel: string) =>
      `Tocá el mapa para marcar el ${roleLabel}. Tocá este botón de nuevo para cancelar.`,
  },
  geolocation: {
    permissionDenied:
      "No nos diste permiso para ver tu ubicación. Podés habilitarlo desde el candado en la barra de direcciones del navegador.",
    unableToDetermine:
      "No se pudo determinar tu ubicación. Revisá que el GPS o la ubicación del dispositivo estén encendidos.",
    timeout: "La búsqueda de tu ubicación tardó demasiado. Probá de nuevo.",
    genericError: "No se pudo obtener tu ubicación.",
    unsupportedBrowser: "Este navegador no puede darnos tu ubicación.",
    grantPermissionHint: "Si el navegador te pregunta, elegí «Permitir».",
    found: (meters: number) => `Te encontramos · precisión ${meters} m`,
    noGpsFallback: "No hay GPS: buscando tu ubicación aproximada por Wi-Fi...",
  },
  routeInput: {
    originPlaceholder: "¿Desde dónde salís?",
    destinationPlaceholder: "¿A dónde vas?",
    chargerAtDestination: {
      legend: "¿Tenés dónde cargar en el destino?",
      yes: "Sí, tengo",
      no: "No tengo",
    },
    routeMode: {
      legend: "¿Cómo priorizamos el viaje?",
      eficiente: "Más eficiente",
      rapido: "Lo antes posible",
      economico: "Económico",
    },
    useMyLocation: "Usar mi ubicación",
    locatingYou: "Buscando tu ubicación...",
    swapPoints: "Invertir origen y destino",
  },
  nextStep: {
    chooseOrigin: "Elegí desde dónde salís: escribí una dirección o tocá el mapa.",
    chooseDestination: "Ahora elegí a dónde vas.",
    samePoint: "El origen y el destino están demasiado cerca: alejá uno de los dos.",
    loadingVehicles: "Esperá un momento, estamos cargando tus vehículos.",
    addVehicle: "Agregá un auto acá abajo para poder calcular el viaje.",
    answerCharger: "Contanos si tenés dónde cargar al llegar.",
    readyToCalculate: "Ya está todo: tocá «Calcular ruta».",
  },
  vehiclePanel: {
    activeVehicle: "Vehículo activo",
    loadingVehicles: "Cargando vehículos...",
    // "auto" y no "vehículo": igual que en el perfil.
    addVehicle: "Agregar un auto",
  },
  stationDetail: {
    goHere: "Ir hasta acá desde mi ubicación",
    locatingYou: "Buscando tu ubicación...",
  },
  stationDetailRows: {
    address: "Dirección",
    department: "Departamento",
    noCable: " (sin cable)",
    connector: "Conector",
    operator: "Operador",
    coordinates: "Coordenadas",
  },
  // Estado en vivo de una estación. No hay etiqueta para «desconocido» a
  // propósito: cuando la fuente no dice nada, o dice algo que no sabemos
  // traducir, el chip directamente no se dibuja (ver StationStatusChip).
  stationStatus: {
    estado: {
      disponible: "Disponible",
      ocupado: "En uso",
      fuera_de_servicio: "Fuera de servicio",
    },
    // Va siempre al lado del chip: el dato es de un tercero y de un momento, y
    // las dos cosas cambian qué conviene hacer con él.
    origen: (fuente: string, cuando: string) => `según ${fuente}, ${cuando}`,
    hace: (minutos: number) => `hace ${minutos} min`,
    reciente: "hace menos de 1 min",
  },
  speedAdvisory: {
    pendingRechargeNotNeeded:
      "A este ritmo estás gastando menos de lo previsto: es posible que no necesites la parada de carga planeada.",
    arrivingWithMargin: "Vas a llegar con margen de batería a este ritmo.",
    tightBase: (extraPct: number) =>
      `Vas a llegar, pero muy justo de batería (te sobraría apenas ${extraPct}% a este ritmo).`,
    tightSuggestion: (speed: number) => ` Bajando a ~${speed} km/h tendrías más margen.`,
    tightMaintain: " Mantené este ritmo, sin acelerar.",
    warnBase: (currentSpeed: number, suggestedSpeed: number) =>
      `Al ritmo actual (~${currentSpeed} km/h) no te alcanza la batería para llegar. Bajando a ~${suggestedSpeed} km/h deberías llegar con lo que te queda`,
    warnPendingRecharge: ", sin necesidad de la parada de carga planeada.",
    warnNoPendingRecharge: ".",
    dangerPendingRecharge:
      "No te alcanza la batería aunque bajes la velocidad: seguí el plan y parás en la próxima estación de carga.",
    dangerNoPendingRecharge: "No te alcanza la batería para llegar aunque bajes la velocidad.",
  },
  mapCanvas: {
    zoomIn: "Acercar el mapa",
    zoomOut: "Alejar el mapa",
    locateFailed: (reason: string) =>
      `No pudimos centrar el mapa en tu ubicación: ${reason}. Mostrando Uruguay entero.`,
    reasonPermissionDenied:
      "no le diste permiso de ubicación a este sitio, o quedó bloqueado de una visita anterior. Para habilitarlo: tocá el candado 🔒 junto a la dirección del sitio y activá la ubicación (o revisá que la ubicación esté encendida en el dispositivo)",
    reasonUnableToDetermine:
      "no se pudo determinar tu ubicación (revisá que el GPS o la ubicación del dispositivo estén encendidos)",
  },
  stars: {
    ratingLabel: (value: string) => `${value} de 5 estrellas`,
    starLabel: (n: number) => `${n} de 5 estrellas`,
  },
  layers: {
    originDestinationMarkers: {
      origin: "Origen",
      destination: "Destino",
    },
    routeLayers: {
      tollAmount: (amount: string) => `Peaje: ${amount}`,
      tollUnknownAmount: "Tramo con peaje (monto exacto no disponible)",
      radarLabel: (name: string) => `Radar: ${name}`,
      radarWithSpeed: (name: string, maxspeed: number) => `Radar: ${name} (máx. ${maxspeed} km/h)`,
    },
    stationsLayer: {
      detailInMenu: "Detalle completo y reseñas en el menú.",
    },
  },
};
