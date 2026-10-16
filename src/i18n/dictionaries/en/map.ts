export const map = {
  replay: {
    suffix: (date: string) => ` · trip from ${date}`,
  },
  tripDashboard: {
    // The mode's name comes from routeInput.routeMode (the one that was
    // chosen); this only says what it meant for THIS route.
    tripMode: {
      label: "Trip type",
      eficiente: "Balances travel time against battery use.",
      rapido: "Prioritizes arriving sooner, even if it uses more battery.",
      economico: "Prioritizes spending less money on recharges.",
    },
    margin: {
      noPlanFallback:
        " There's no charging plan that respects that margin on this trip: showing the best route available.",
      reserveApplied: (pct: string) =>
        ` Since you said you don't have anywhere to charge at the destination, the trip was calculated keeping ${pct}% in reserve so you can reach a charger.`,
      reserveNotEnough:
        " It's also not enough to reach a charger after arriving: check whether you'll be able to charge before then.",
    },
    destinationCharger: {
      distance: (km: string) => `${km} km in a straight line from the destination`,
      tooFar: "It's too far to count on: check whether you'll be able to charge before you arrive.",
    },
    cost: {
      tollsNoAmount: "amount unknown",
      tollsPartialAmount: (amount: string) => `${amount} and others with unknown amount`,
    },
    stopCard: {
      occupationValue: (price: string, min: number) => `$ ${price}/min after ${min} min`,
      backupValue: (name: string, km: number, tooFar: boolean) =>
        `${name} at ${km} km${tooFar ? " — no backup nearby" : ""}`,
      poiParadaLarga: "for a longer stop",
      poiDist: (m: number) => `${m} m away`,
      poiCategoria: {
        cafe_kiosco: "Café / shop",
        bano: "Restroom",
        farmacia: "Pharmacy",
        comida_rapida: "Fast food",
        comida: "Sit-down meal",
        compras: "Supermarket",
      },
    },
    startTrip: "Start trip",
    startTripAgain: "Start trip again",
    cancelTrip: "Cancel trip",
    cancelPlan: "Cancel",
    live: {
      gpsDebug: (accuracy: string, gap: string) => `GPS: accuracy ±${accuracy}m · every ${gap}s`,
      radarAlert: (name: string) => `Radar ahead: ${name}`,
      radarAlertWithSpeed: (name: string, maxspeed: number) =>
        `Radar ahead: ${name} (max ${maxspeed} km/h)`,
      radarVibration: "Vibrate when approaching a radar",
    },
  },
  // /app side panel: the shell (tabs, bottom sheet) and the redesign's new
  // copy. Anything that already existed stays in its usual section.
  panel: {
    ariaLabel: "Trip panel",
    tabTrip: "Trip",
    tabStations: "Stations",
    sheetPlan: "Plan your trip",
    sheetSummary: (from: string, to: string, time: string) => `${from} → ${to} · ${time}`,
    plan: {
      chargeHelp: {
        none: "This changes how much battery you need on arrival.",
        yes: "You can arrive lower, since you will charge there.",
        no: "We'll show the charger closest to your destination and keep a buffer.",
      },
      vehicle: "Vehicle",
      changeVehicle: "Change vehicle",
      vehicleSub: (kwh: string, km: string) => `${kwh} kWh · ${km} km of range`,
      batteryAtStart: "Battery at departure",
      range: (km: string) => `≈ ${km} km of range`,
      levels: { high: "High", mid: "Medium", low: "Low" },
      less: "Down 5%",
      more: "Up 5%",
      noVehicleTitle: "You haven't added a car yet",
      noVehicleBody: "Pick it from 328 models in your profile. It takes a minute.",
      calculating: "Planning route…",
      calculatingNote: "Looking for charging stops along the way.",
      calculatingSlow: "This is taking longer than usual. Still working on it.",
      retry: "Try again",
    },
    stations: {
      search: "Search by name or city",
      filters: { all: "All", fast: "Fast · 50 kW and up", ute: "UTE", priv: "Private" },
      count: (n: number) =>
        `${n} ${n === 1 ? "station" : "stations"} · UTE network and private operators`,
      privateTag: "Private",
      noMatch: (q: string) => `No stations match “${q}”.`,
      noMatchFilter: "No stations with that filter.",
      loadFailedTitle: "We couldn't load the stations",
      loadFailedBody: "You can keep planning your trip. Try again in a few seconds.",
      loading: "Loading stations…",
      back: "Stations",
      maxPower: "max power",
      connectors: "connectors",
      rating: "rating",
      note: "Note",
      reportTitle: "Report status",
      reportQuestion: "How is it right now?",
      reportFirst: "No reports yet. Be the first.",
      sendReport: "Send report",
      reportThanks: "Thanks. Others can see it now.",
      reviews: "Reviews",
      reviewCount: (n: number) => (n === 1 ? "1 review" : `${n} reviews`),
      noReviewsTitle: "No reviews yet",
      noReviewsBody: "Share how it went and help the next driver.",
    },
    trip: {
      yourTrip: "Your trip",
      edit: "Edit",
      arriveWith: "You arrive with",
      tone: { ok: "Good margin", low: "Low margin", crit: "Critical" },
      advice: {
        ok: "You'll have plenty of charge left to get around.",
        low: "Tight margin. Keep it at 90 km/h or below to be safe.",
        crit: "You would arrive almost empty. Start with more charge or pick “Fastest arrival” to add a stop.",
      },
      time: "Estimated time",
      cost: "Estimated cost",
      timeParts: { driving: "Driving", traffic: "Traffic", charging: "Charging" },
      costParts: { home: "Home energy", energy: "Energy", recharges: "Charging", tolls: "Tolls" },
      withoutTariff: (n: number) => `${n} ${n === 1 ? "stop" : "stops"} without a rate`,
      distance: "Distance",
      avgSpeed: "Avg. speed",
      batteryUsed: "Battery used",
      stops: "Stops",
      tolls: "Tolls",
      noTolls: "No tolls",
      destinationCharger: "Charger closest to your destination",
      stopsTitle: (n: number) => (n ? `Charging stops · ${n}` : "Charging stops"),
      stopAdd: "Charge",
      stopTime: "Time",
      stopCost: "Cost",
      noRate: "No rate",
      charger: "Charger",
      fee: "Idle fee",
      backup: "Backup",
      nearby: "Walkable",
      noStops: "No charging stops needed on this trip.",
      noRouteTitle: "We couldn't find a route",
      noRouteBody: (pct: number) =>
        `Starting with ${pct}% battery, no combination of chargers gets you to your destination.`,
      noRouteTips: [
        "Start with more charge.",
        "Try “Fastest arrival”: it looks for closer chargers.",
      ],
      editTrip: "Edit trip",
      live: "On trip",
      traveled: "Traveled",
      battery: "Battery",
      elapsed: "Time",
      speed: "Speed",
      of: (km: string) => `of ${km} km`,
    },
  },
  page: {
    title: "RouteEV · Map",
    showPanel: "Show panel",
    hidePanel: "Hide panel",
    loadFailed: (failed: string) =>
      `Couldn't load: ${failed}. Check your connection and try again.`,
    tapToMark: (role: "origin" | "destination") =>
      `Tap the map to mark ${role === "origin" ? "the origin" : "the destination"}`,
    cancel: "Cancel",
    calculateRoute: "Plan route",
    readyToCalculate: "Ready to plan.",
  },
  liveTrip: {
    saveFailed: "The trip could not be saved to your history. Its data was lost.",
    saveNoPlan:
      "This route comes from a trip you already saved. Calculate the route again to record a new one.",
    arrived: "You arrived at your destination",
    offRoute: (km: string) =>
      `You're ${km} km from the calculated route: progress can't be tracked until you're on it.`,
    passedStation: (name: string) => `You passed ${name}: battery updated`,
    driftedFromRoute: "You drifted away from the calculated route",
    onRoute: "On route...",
    permissionDenied:
      "Location permission denied: enable it in your browser settings to follow the trip live.",
    searchingGps: "Searching for GPS signal...",
    locationUnavailable: "We couldn't get your location right now.",
    unsupportedBrowser:
      "Your browser doesn't support geolocation: live trip tracking isn't available.",
    insecureContext: "Live tracking needs a secure connection (HTTPS).",
    searchingLocation: "Finding your location...",
    tooFarFromOrigin: (km: string) =>
      `Can't start the trip: you're ${km} km from the route's origin. Get closer to the origin, or recalculate the route from where you are now (you can use "Use my location as origin").`,
  },
  stationReviews: {
    loading: "Loading reviews...",
    loadError: "Couldn't load reviews for this station.",
    starsRequired: "Choose a star rating.",
    saveError: "Couldn't save the review.",
    deleteError: "Couldn't delete the review.",
    uploadPhotoError: "Couldn't upload the photo.",
    removePhotoError: "Couldn't remove the photo.",
    yourReview: "Your review",
    writeReview: "Write a review",
    commentPlaceholder: "How was your experience at this station? (optional)",
    removePhoto: "Remove photo",
    changePhoto: "Change photo",
    addPhoto: "Add photo",
    saving: "Saving...",
    update: "Update",
    publish: "Publish",
    delete: "Delete",
  },
  stationStatusReport: {
    funciona: "Working",
    ocupado: "Occupied",
    noFunciona: "Not working",
    enviando: "Sending...",
    sendError: "Couldn't send the report.",
    reporte: (estado: string, cuando: string) => `${estado} · ${cuando}`,
    haceMin: (minutos: number) => `${minutos} min ago`,
    haceHoras: (horas: number) => `${horas} h ago`,
    reciente: "just now",
  },
  routeAutocomplete: {
    originLabel: "Origin",
    destinationLabel: "Destination",
    roleLabel: (role: "origin" | "destination"): string =>
      role === "origin" ? "origin" : "destination",
    searching: "Searching...",
    // What each suggestion is (see map/lugares.ts).
    kindDepartment: "Department",
    kindCity: "City",
    kindStreet: "Street",
    departmentHint: (capital: string) => `Takes you to ${capital}, its capital`,
    capitalOf: (departamento: string) => `Capital of ${departamento}`,
    streetHint: "Street intersection",
    departmentValue: (departamento: string) => `${departamento} department`,
    cityValue: (nombre: string, departamento: string) =>
      nombre === departamento ? `${nombre} (city)` : `${nombre}, ${departamento}`,
    departmentChosen: (capital: string) =>
      `Using the center of ${capital}, the department's capital.`,
    addressFound: (address: string) => `Found: ${address}`,
    addressImprecise: (km: string) =>
      ` (${km} km from the nearest street in our covered map -- may not be accurate)`,
    addressSearchError: "Couldn't search for that address.",
    keepTyping: "Keep typing to search...",
    searchAsAddress: (label: string) => `Search "${label}" as a full address`,
    clearRole: (roleLabel: string) => `Clear the ${roleLabel}`,
    pickOnMapActive: (roleLabel: string) =>
      `Tap the map to mark the ${roleLabel}, or tap here to cancel`,
    pickOnMap: (roleLabel: string) => `Mark the ${roleLabel} by tapping the map`,
    pickOnMapActiveSr: (roleLabel: string) =>
      `Tap the map to mark the ${roleLabel}. Tap this button again to cancel.`,
  },
  geolocation: {
    permissionDenied:
      "You didn't grant us permission to see your location. You can enable it from the lock icon in your browser's address bar.",
    unableToDetermine:
      "We couldn't determine your location. Check that GPS or device location is turned on.",
    timeout: "Finding your location took too long. Try again.",
    genericError: "We couldn't get your location.",
    unsupportedBrowser: "This browser can't give us your location.",
    grantPermissionHint: 'If the browser asks, choose "Allow".',
    found: (meters: number) => `Found you · ${meters} m accuracy`,
    noGpsFallback: "No GPS available: finding your approximate location via Wi-Fi...",
  },
  routeInput: {
    originPlaceholder: "Where are you starting?",
    destinationPlaceholder: "Where are you going?",
    chargerAtDestination: {
      legend: "Can you charge at your destination?",
      yes: "Yes, I can",
      no: "No, I can't",
    },
    routeMode: {
      legend: "What should we prioritize?",
      eficiente: "Most efficient",
      rapido: "Fastest arrival",
      economico: "Lowest cost",
    },
    useMyLocation: "Use my location",
    locatingYou: "Finding your location...",
    swapPoints: "Swap origin and destination",
  },
  nextStep: {
    chooseOrigin: "Choose where you start: type an address or tap the map.",
    chooseDestination: "Now choose where you are going.",
    samePoint: "The origin and destination are too close together: move one of them.",
    loadingVehicles: "Hang on, we're loading your vehicles.",
    addVehicle: "Add a car below to plan the trip.",
    answerCharger: "Tell us if you can charge when you arrive.",
    readyToCalculate: "All set: tap “Plan route”.",
  },
  vehiclePanel: {
    activeVehicle: "Active vehicle",
    loadingVehicles: "Loading vehicles...",
    addVehicle: "Add a car",
  },
  stationDetail: {
    goHere: "Get here from my location",
    locatingYou: "Finding your location...",
  },
  stationDetailRows: {
    address: "Address",
    department: "Department",
    noCable: " (no cable)",
    connector: "Connector",
    operator: "Operator",
    coordinates: "Coordinates",
  },
  // Live status of a charging station. There is no "unknown" label on purpose:
  // when the source says nothing, or says something we can't translate, the
  // chip is not rendered at all (see StationStatusChip).
  stationStatus: {
    estado: {
      disponible: "Available",
      ocupado: "In use",
      fuera_de_servicio: "Out of order",
    },
    // Always shown next to the chip: this is somebody else's reading, from
    // some moment. Both facts change what you should do with it.
    origen: (fuente: string, cuando: string) => `per ${fuente}, ${cuando}`,
    hace: (minutos: number) => `${minutos} min ago`,
    reciente: "less than 1 min ago",
  },
  speedAdvisory: {
    pendingRechargeNotNeeded:
      "At this pace you're using less than expected: you might not need the planned charging stop.",
    arrivingWithMargin: "You'll arrive with battery to spare at this pace.",
    tightBase: (extraPct: number) =>
      `You'll make it, but with very little battery to spare (only ~${extraPct}% left at this pace).`,
    tightSuggestion: (speed: number) =>
      ` Slowing down to ~${speed} km/h would give you more margin.`,
    tightMaintain: " Keep this pace, don't speed up.",
    warnBase: (currentSpeed: number, suggestedSpeed: number) =>
      `At your current pace (~${currentSpeed} km/h) the battery won't get you there. Slowing down to ~${suggestedSpeed} km/h should get you there with what you have left`,
    warnPendingRecharge: ", without needing the planned charging stop.",
    warnNoPendingRecharge: ".",
    dangerPendingRecharge:
      "The battery won't get you there even if you slow down: stick to the plan and stop at the next charging station.",
    dangerNoPendingRecharge: "The battery won't get you there even if you slow down.",
  },
  mapCanvas: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    locateFailed: (reason: string) =>
      `We couldn't center the map on your location: ${reason}. Showing all of Uruguay.`,
    reasonPermissionDenied:
      "you didn't grant this site location permission, or it was blocked in a previous visit. To enable it: tap the 🔒 lock icon next to the site's address and turn on location (or check that location is turned on for your device)",
    reasonUnableToDetermine:
      "we couldn't determine your location (check that GPS or device location is turned on)",
  },
  stars: {
    ratingLabel: (value: string) => `${value} out of 5 stars`,
    starLabel: (n: number) => `${n} out of 5 stars`,
  },
  layers: {
    originDestinationMarkers: {
      origin: "Origin",
      destination: "Destination",
    },
    routeLayers: {
      tollAmount: (amount: string) => `Toll: ${amount}`,
      tollUnknownAmount: "Toll segment (exact amount not available)",
      radarLabel: (name: string) => `Radar: ${name}`,
      radarWithSpeed: (name: string, maxspeed: number) => `Radar: ${name} (max ${maxspeed} km/h)`,
    },
    stationsLayer: {
      detailInMenu: "Full details and reviews in the menu.",
    },
  },
};
