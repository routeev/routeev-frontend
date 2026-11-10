export const landing = {
  meta: {
    title: "RouteEV — Planificá viajes en auto eléctrico por Uruguay",
    description:
      "Calculá si tu auto eléctrico llega, y dónde parar a cargar, sobre el mapa vial real de Uruguay y las 261 estaciones de carga de UTE y de operadores privados. 328 modelos precargados, sin crear cuenta.",
    ogTitle: "¿Llega tu auto eléctrico? Fijate antes de salir.",
    ogDescription:
      "Elegí uno de 328 modelos, marcá origen y destino, y RouteEV te dice si llegás, dónde cargar y cuánto sale. Sobre el mapa real de Uruguay.",
    jsonLdDescription:
      "Planificador de viajes para vehículos eléctricos en Uruguay: calcula si tu auto llega, dónde parar a cargar y cuánto cuesta, sobre el mapa vial real del país.",
  },
  nav: {
    ariaLabel: "Principal",
    // "Inicio" lo usan todas las páginas menos la landing.
    home: "Inicio",
    showroom: "Showroom",
    // /app y /profile.
    map: "Mapa",
    light: "Claro",
    dark: "Oscuro",
    getApp: "Bajar la app",
    here: "Estás acá",
    menu: "Menú",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    language: "Idioma",
  },
  header: {
    goToApp: "Ir a la app",
    login: "Iniciar sesión",
    createAccount: "Crear cuenta",
    createFreeAccount: "Crear cuenta gratis",
  },
  hero: {
    eyebrow: "Planificador de viajes en auto eléctrico · Uruguay",
    titleLead: "¿Llega tu auto eléctrico?",
    titleAccent: "Fijate antes de salir.",
    subtitle:
      "Elegí tu auto, marcá origen y destino y te decimos dónde cargar, cuánto tardás y cuánto sale. Sobre el mapa vial real de Uruguay.",
    cta: "Probar con mi auto",
    ctaSignup: "o crear cuenta gratis",
    ctaApp: "o seguir en la app",
    note: "Sin cuenta: elegís el modelo y calculás el viaje.",
    appLink: "¿Preferís el celular? Bajá la app",
    // El viaje de ejemplo del mapa: datos de ejemplo, no un cálculo real.
    mapAria:
      "Ejemplo de viaje de Montevideo a Rivera: 497 km, 1 parada de carga en Paso de los Toros, llegás con 24 %",
    vehicle: "BYD Dolphin · salís con 100 %",
    stops: "Paradas",
  },
  stores: {
    scanToGet: "Escaneá para bajar la app",
    qrAlt: "Código QR para bajar la app",
  },
  data: {
    title: "Hecho con datos reales",
    body: "Nada de promedios: el cálculo usa la red vial y los cargadores que existen.",
    intersections: "intersecciones reales de OpenStreetMap",
    departments: "departamentos, todo el país",
    stations: "estaciones de carga de UTE y privadas",
    models: "modelos de auto eléctrico precargados",
  },
  battery: {
    title: "La autonomía real no es la del folleto.",
    body: "Con cuánta batería salís cambia el viaje entero. RouteEV hace la cuenta con tu modelo y el mapa vial real, y te dice dónde parar.",
    question: "Probá: ¿con cuánta batería salís?",
    sample: "BYD Dolphin · datos de ejemplo",
    arriveWith: "Llegás con",
    goodMargin: "Con margen",
    lowMargin: "Margen bajo",
    goodMarginMessage: "Llegás con batería de sobra para moverte allá.",
    lowMarginMessage: "Llegás con poco margen. Manejá a 90 km/h o menos para no quedarte corto.",
    time: "Tiempo",
    cost: "Costo",
    stops: "Paradas de carga",
    routeAria: (stops: number) =>
      `Ruta Montevideo a Rivera con ${stops} ${stops === 1 ? "parada" : "paradas"} de carga`,
  },
  howItWorks: {
    title: "Cuatro pasos, sin cuenta.",
    body: "Es lo mismo que hacés en el showroom: entrás y en un minuto sabés si llegás.",
    pickCar: {
      title: "Elegí tu auto",
      body: "Buscalo entre 328 modelos y mirá su ficha.",
    },
    setPoints: {
      title: "Marcá origen y destino",
      body: "Escribí una dirección o tocá el mapa.",
    },
    calculate: {
      title: "Calculamos la ruta",
      body: "Por rutas reales, con las paradas de carga que hacen falta.",
    },
    arrive: {
      title: "Mirá con cuánto llegás",
      body: "Batería al llegar, tiempo y costo del viaje.",
    },
    oneStop: "1 parada",
    goodMargin: "Con margen",
  },
  faq: {
    title: "Dudas antes de salir.",
    body: "Lo que más nos preguntan sobre el cálculo, los datos y la cuenta.",
    items: [
      {
        question: "¿RouteEV es gratis?",
        answer: "Sí. Planificar un viaje no tiene costo, ni en la web ni en la app del celular.",
      },
      {
        question: "¿Necesito crear una cuenta?",
        answer:
          "No. En el showroom elegís el modelo y calculás un viaje sin registrarte. La cuenta sirve para guardar tus autos y tu historial de viajes.",
      },
      {
        question: "¿De dónde salen los datos?",
        answer:
          "La red vial es la de OpenStreetMap. Las 261 estaciones de carga son las de UTE y de operadores privados, y los 328 modelos usan las especificaciones de fábrica.",
      },
      {
        question: "¿Qué tan exacta es la estimación?",
        answer:
          "Es una referencia calculada con tu modelo y el mapa vial real. La batería con la que llegás cambia con la velocidad, el clima y la carga del auto, así que dejá siempre un margen.",
      },
      {
        question: "¿Cómo se calcula el costo del viaje?",
        answer:
          "Con la tarifa que publica cada operador de carga. Si una parada es en un operador que no publica su tarifa, te avisamos y esa recarga queda fuera del total.",
      },
      {
        question: "Mi auto no aparece en la lista, ¿qué hago?",
        answer:
          "Escribinos con la marca, el modelo y el año. Mientras tanto podés calcular con un modelo de batería parecida.",
      },
      {
        question: "Encontré un cargador que no funciona",
        answer:
          "Abrí la ficha de la estación en el mapa y reportá su estado. El aviso les sirve a quienes pasen después.",
      },
      {
        question: "¿Qué hacen con mis datos?",
        answer:
          "Guardamos lo necesario para tu cuenta: tus autos y tu historial de viajes. Si nos pedís borrarla, eliminamos todo eso.",
        privacyLink: "Leer la política de privacidad",
      },
    ],
    contact: {
      label: "Contacto",
      title: "¿No está tu duda? Escribinos y te contesta alguien del equipo.",
      topicsAria: "Escribir sobre un tema",
      // Cada tema abre el correo con ese asunto.
      topics: ["Mi auto no aparece", "Un dato está mal", "Otra consulta"],
      copyEmail: "Copiar el correo",
      emailCopied: "Correo copiado.",
      instagram: "@routeev.uy en Instagram",
      cta: "Escribinos",
    },
  },
  closing: {
    title: "Probalo con tu auto.",
    webLabel: "En la web",
    webBody: "Entrás al showroom, elegís el modelo y calculás un viaje. Sin cuenta.",
    webCta: "Calcular un viaje",
    phoneLabel: "En tu celular",
    phoneBody: "Planificá desde el celular y seguí el viaje mientras manejás.",
  },
  footer: {
    ariaLabel: "Pie de página",
  },
};
