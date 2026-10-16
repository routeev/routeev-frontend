export const landing = {
  meta: {
    title: "RouteEV — Plan electric car trips across Uruguay",
    description:
      "Find out if your electric car can make it, and where to stop and charge, on the real road map of Uruguay and its 261 charging stations from UTE and private operators. 328 preloaded models, no account needed.",
    ogTitle: "Will your electric car make it? Check before you go.",
    ogDescription:
      "Pick one of 328 models, set your origin and destination, and RouteEV tells you if you'll make it, where to charge, and what it costs. On the real map of Uruguay.",
    jsonLdDescription:
      "Trip planner for electric vehicles in Uruguay: calculates whether your car will make it, where to stop and charge, and how much it costs, on the country's real road map.",
  },
  nav: {
    ariaLabel: "Main",
    // "Inicio" lo usan todas las páginas menos la landing.
    home: "Home",
    showroom: "Showroom",
    // /app y /profile.
    map: "Map",
    light: "Light",
    dark: "Dark",
    getApp: "Get the app",
    here: "You are here",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },
  header: {
    goToApp: "Go to the app",
    login: "Log in",
    createAccount: "Create account",
    createFreeAccount: "Create a free account",
  },
  hero: {
    eyebrow: "Electric car trip planner · Uruguay",
    titleLead: "Will your EV make it?",
    titleAccent: "Check before you leave.",
    subtitle:
      "Pick your car, set your start and destination, and we’ll tell you where to charge, how long it takes and what it costs. On Uruguay’s real road map.",
    cta: "Try it with my car",
    ctaSignup: "or create a free account",
    ctaApp: "or continue in the app",
    note: "No account needed: pick the model and plan the trip.",
    appLink: "Prefer your phone? Get the app",
    // El viaje de ejemplo del mapa: datos de ejemplo, no un cálculo real.
    mapAria:
      "Sample trip from Montevideo to Rivera: 497 km, 1 charging stop in Paso de los Toros, you arrive with 24%",
    vehicle: "BYD Dolphin · leaving at 100%",
    stops: "Stops",
  },
  stores: {
    scanToGet: "Scan to get the app",
    qrAlt: "QR code to get the app",
  },
  data: {
    title: "Built on real data",
    body: "No averages: the calculation uses the road network and chargers that actually exist.",
    intersections: "real intersections from OpenStreetMap",
    departments: "departments, the whole country",
    stations: "UTE and private charging stations",
    models: "electric car models preloaded",
  },
  battery: {
    title: "Real range isn’t the brochure range.",
    body: "How much charge you leave with changes the whole trip. RouteEV runs the numbers with your model and the real road map, and tells you where to stop.",
    question: "Try it: how much charge do you leave with?",
    sample: "BYD Dolphin · sample data",
    arriveWith: "You arrive with",
    goodMargin: "Good margin",
    lowMargin: "Low margin",
    goodMarginMessage: "You arrive with plenty of charge to get around.",
    lowMarginMessage:
      "You arrive with little margin. Keep it at 90 km/h or less so you don’t fall short.",
    time: "Time",
    cost: "Cost",
    stops: "Charging stops",
    routeAria: (stops: number) =>
      `Montevideo to Rivera route with ${stops} charging ${stops === 1 ? "stop" : "stops"}`,
  },
  howItWorks: {
    title: "Four steps, no account.",
    body: "It’s exactly what you do in the showroom: open it and within a minute you know if you’ll make it.",
    pickCar: {
      title: "Pick your car",
      body: "Search among 328 models and see its spec sheet.",
    },
    setPoints: {
      title: "Set start and destination",
      body: "Type an address or tap the map.",
    },
    calculate: {
      title: "We calculate the route",
      body: "On real roads, with the charging stops you need.",
    },
    arrive: {
      title: "See what you arrive with",
      body: "Battery on arrival, trip time and cost.",
    },
    oneStop: "1 stop",
    goodMargin: "Good margin",
  },
  closing: {
    title: "Try it with your car.",
    webLabel: "On the web",
    webBody: "Open the showroom, pick your model and plan a trip. No account needed.",
    webCta: "Plan a trip",
    phoneLabel: "On your phone",
    phoneBody: "Plan from your phone and follow the trip while you drive.",
  },
  footer: {
    ariaLabel: "Footer",
  },
};
