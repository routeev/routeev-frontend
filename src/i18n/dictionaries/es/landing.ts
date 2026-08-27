export const landing = {
  meta: {
    title: "RouteEV — Planificá viajes en auto eléctrico por Uruguay",
    description:
      "Calculá si tu auto eléctrico llega, y dónde parar a cargar, sobre el mapa vial real de Uruguay y las 259 estaciones de carga de UTE y de operadores privados. 631 modelos precargados, sin crear cuenta.",
    ogTitle: "¿Llega tu auto eléctrico? Fijate antes de salir.",
    ogDescription:
      "Elegí uno de 631 modelos, marcá origen y destino, y RouteEV te dice si llegás, dónde cargar y cuánto sale. Sobre el mapa real de Uruguay.",
    jsonLdDescription:
      "Planificador de viajes para vehículos eléctricos en Uruguay: calcula si tu auto llega, dónde parar a cargar y cuánto cuesta, sobre el mapa vial real del país.",
  },
  nav: {
    home: "Inicio",
    showroom: "Showroom",
    howItWorks: "Cómo funciona",
    realData: "Datos reales",
  },
  header: {
    goToApp: "Ir a la app",
    login: "Iniciar sesión",
    createAccount: "Crear cuenta",
  },
  hero: {
    eyebrow: "Movilidad eléctrica",
    titleLine1: "Tu auto eléctrico no se detiene",
    titleLine2: "en Uruguay; tu batería tampoco.",
    subtitle:
      "RouteEV calcula la ruta más eficiente para tu vehículo eléctrico sobre el mapa vial real del país, revisando tu batería tramo a tramo y sumando las paradas de carga que hagan falta en el camino.",
    ctaPrimary: "Ver el catálogo y simular un viaje",
    ctaSecondary: "Crear cuenta gratis",
    note: "El catálogo no pide cuenta: entrás, elegís un auto y calculás el viaje.",
    visualCaption: "Montevideo → Rivera · 497 km, 1 parada de carga",
  },
  stats: {
    intersections: "Intersecciones reales de OpenStreetMap",
    departments: "Departamentos cubiertos",
    stations: "Estaciones de carga en el mapa",
    models: "Modelos de auto eléctrico precargados",
  },
  problem: {
    eyebrow: "El problema",
    title: "La autonomía real no es la del folleto.",
    body: "Un vehículo eléctrico rinde distinto en cada calle: el tráfico, la velocidad y el propio consumo del auto cambian cuánta batería queda al llegar. Los mapas comunes calculan el camino más corto o más rápido, pero ninguno te avisa si esa ruta es la que tu batería puede hacer, ni dónde parar a cargar si no.",
  },
  solution: {
    eyebrow: "La solución",
    title: "Un motor de rutas que entiende de baterías.",
    body: "RouteEV construye el camino sobre el grafo vial real del país (no una aproximación): cada calle pesa lo que realmente cuesta recorrerla, y el sistema revisa tu batería antes de cada tramo. Si no alcanza, busca una estación de carga real en el camino, sin que tengas que planearlo vos.",
  },
  showroomSection: {
    eyebrow: "Showroom · sin cuenta",
    title: "Antes de comprarlo, fijate si llega.",
    body1:
      "Buscá cualquiera de los 631 autos eléctricos del catálogo y mirá sus números de verdad: batería, autonomía real, consumo, cuánto cuesta cada 100 km en pesos y cuánto tarda en cargar en las estaciones que existen en Uruguay.",
    body2:
      "Y con el auto elegido, calculá un viaje concreto como si lo pidieras desde el mapa: el mismo motor de rutas devuelve la distancia, el tiempo, la batería con la que llegás, los peajes, el costo total y en qué estación de carga hay que parar, con su dirección y su potencia.",
    cta: "Entrar al showroom",
    steps: {
      search: "Buscás el modelo por su nombre",
      view: "Ves su ficha completa, con foto",
      choose: "Elegís desde dónde y hasta dónde",
      result: "Te dice si llega, y dónde para a cargar",
    },
  },
  howItWorks: {
    eyebrow: "Cómo funciona",
    title: "Cuatro pasos, un viaje calculado.",
    steps: {
      loadVehicle: {
        title: "Cargá tu vehículo",
        body: "Elegí un modelo real de un catálogo de autos eléctricos (Nissan Leaf, Tesla, BYD, y más) o cargá los datos de batería y consumo a mano.",
      },
      markOriginDestination: {
        title: "Marcá origen y destino",
        body: "Hacé click en el mapa, escribí una dirección, o elegí de una lista de intersecciones reales.",
      },
      calculateRoute: {
        title: "Se calcula la ruta",
        body: "El sistema busca el camino más eficiente para tu auto, revisando la batería arista por arista y sumando recargas si hacen falta.",
      },
      viewTripData: {
        title: "Mirá los datos del viaje",
        body: "Distancia, tiempo, energía, peajes, y cada parada de carga con su dirección y potencia real.",
      },
    },
  },
  finalCta: {
    title: "Probalo con tu auto.",
    body: "Elegí un modelo, marcá un viaje que hagas de verdad y fijate si llega. No pide cuenta.",
    ctaPrimary: "Calcular un viaje",
    ctaSecondary: "Crear cuenta gratis",
  },
};
