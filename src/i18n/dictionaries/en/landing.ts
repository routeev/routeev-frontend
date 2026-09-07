export const landing = {
  meta: {
    title: "RouteEV — Plan electric car trips across Uruguay",
    description:
      "Find out if your electric car can make it, and where to stop and charge, on the real road map of Uruguay and its 261 charging stations from UTE and private operators. 632 preloaded models, no account needed.",
    ogTitle: "Will your electric car make it? Check before you go.",
    ogDescription:
      "Pick one of 632 models, set your origin and destination, and RouteEV tells you if you'll make it, where to charge, and what it costs. On the real map of Uruguay.",
    jsonLdDescription:
      "Trip planner for electric vehicles in Uruguay: calculates whether your car will make it, where to stop and charge, and how much it costs, on the country's real road map.",
  },
  nav: {
    home: "Home",
    showroom: "Showroom",
    howItWorks: "How it works",
    realData: "Real data",
  },
  header: {
    goToApp: "Go to the app",
    login: "Log in",
    createAccount: "Create account",
  },
  hero: {
    eyebrow: "Electric mobility",
    titleLine1: "Your electric car doesn't stop",
    titleLine2: "in Uruguay; neither does your battery.",
    subtitle:
      "RouteEV calculates the most efficient route for your electric vehicle on the country's real road map, checking your battery stretch by stretch and adding the charging stops you'll need along the way.",
    ctaPrimary: "Browse the catalog and simulate a trip",
    ctaSecondary: "Create a free account",
    note: "The catalog doesn't require an account: you enter, pick a car, and calculate the trip.",
    visualCaption: "Montevideo → Rivera · 497 km, 1 charging stop",
  },
  stats: {
    intersections: "Real OpenStreetMap intersections",
    departments: "Departments covered",
    stations: "Charging stations on the map",
    models: "Preloaded electric car models",
  },
  problem: {
    eyebrow: "The problem",
    title: "Real-world range isn't the one on the brochure.",
    body: "An electric vehicle performs differently on every street: traffic, speed, and the car's own consumption change how much battery is left on arrival. Regular maps calculate the shortest or fastest path, but none of them tell you whether your battery can actually handle that route, or where to stop and charge if it can't.",
  },
  solution: {
    eyebrow: "The solution",
    title: "A routing engine that understands batteries.",
    body: "RouteEV builds the route on the country's real road graph (not an approximation): every street is weighted by what it actually costs to travel, and the system checks your battery before each stretch. If it won't be enough, it finds a real charging station along the way, without you having to plan it yourself.",
  },
  showroomSection: {
    eyebrow: "Showroom · no account needed",
    title: "Before you buy it, check if it'll make it.",
    body1:
      "Search any of the 632 electric cars in the catalog and see the real numbers: battery, real-world range, consumption, how much every 100 km costs in pesos, and how long it takes to charge at the stations that exist in Uruguay.",
    body2:
      "And with your car picked, calculate an actual trip just like you would from the map: the same routing engine returns the distance, time, the battery you'll arrive with, tolls, total cost, and which charging station to stop at, with its address and power output.",
    cta: "Enter the showroom",
    steps: {
      search: "Search for the model by name",
      view: "See its full spec sheet, with photo",
      choose: "Choose where from and where to",
      result: "It tells you if you'll make it, and where to stop and charge",
    },
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "Four steps, one calculated trip.",
    steps: {
      loadVehicle: {
        title: "Load your vehicle",
        body: "Pick a real model from a catalog of electric cars (Nissan Leaf, Tesla, BYD, and more) or enter your own battery and consumption data by hand.",
      },
      markOriginDestination: {
        title: "Set origin and destination",
        body: "Click on the map, type an address, or choose from a list of real intersections.",
      },
      calculateRoute: {
        title: "The route gets calculated",
        body: "The system finds the most efficient path for your car, checking the battery edge by edge and adding recharges if needed.",
      },
      viewTripData: {
        title: "See your trip data",
        body: "Distance, time, energy, tolls, and every charging stop with its address and real power output.",
      },
    },
  },
  finalCta: {
    title: "Try it with your car.",
    body: "Pick a model, set a trip you'd actually take, and see if it makes it. No account needed.",
    ctaPrimary: "Calculate a trip",
    ctaSecondary: "Create a free account",
  },
};
