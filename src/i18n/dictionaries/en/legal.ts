export const legal = {
  eyebrow: "Legal",
  privacy: {
    pageTitle: "Privacy Policy",
    metaDescription:
      "What data RouteEV collects, what it's used for, how long it's kept, and how to exercise your rights under Uruguay's Law 18.331.",
    lastUpdated: "Last updated: August 20, 2026",
    summary:
      "In short: RouteEV asks for the bare minimum to make the app work, doesn't sell your data to anyone, and doesn't show you ads. You can use the showroom and plan an entire trip without creating an account or giving us any data.",
    responsible: {
      heading: "Who is responsible for your data",
      before:
        "RouteEV is a project developed in Montevideo, Uruguay. For any question about your personal data, you can write to",
      after: ".",
    },
    dataCollected: {
      heading: "What data we collect",
      intro: "It depends on how you use the service.",
    },
    noAccount: {
      heading: "If you don't create an account",
      body: "We don't collect any personal data. The vehicle catalog and trip simulator work without identifying you. The origins and destinations you choose are processed to return your route and aren't linked to any person.",
    },
    withAccount: {
      heading: "If you create an account",
      username: {
        label: "Username and password.",
        body: "Your password is stored encrypted: not even we can read it.",
      },
      vehicles: {
        label: "Your vehicles.",
        body: "Model, battery capacity, consumption and, if you upload one, a photo of the vehicle.",
      },
      history: {
        label: "Your trip history.",
        body: "Origins, destinations, distances, and consumption of the trips you save.",
      },
    },
    google: {
      heading: "If you sign in with Google",
      body: "Google shares your email address and name with us to create the account. We don't receive your Google password or have access to any other data in your Google account.",
    },
    mobileTracking: {
      heading: "If you use trip tracking",
      body: "RouteEV uses your location while a trip is active and the browser tab stays open, to calculate your progress and remaining battery. That location is processed on your phone and isn't sent to our servers unless you save the trip. If you lock the screen or the browser goes to the background, tracking stops — that's a browser limitation, not something RouteEV controls. You can revoke the location permission from your browser's or phone's settings at any time.",
    },
    usage: {
      heading: "What we use the data for",
      items: {
        login: "So you can log in and find your vehicles and trips.",
        routes: "To calculate routes tailored to your vehicle.",
        stats:
          "To understand which parts of the product get used and which don't, with aggregated statistics that don't identify anyone.",
      },
      noSellBold: "We don't sell or hand over your personal data to third parties",
      noSellRest: ", nor do we use it for advertising.",
    },
    sharing: {
      heading: "Who we share it with",
      body: "Only with the providers the service needs to run: the infrastructure provider that hosts the app, and Google if you choose to sign in with your Google account. Neither uses your data for its own purposes.",
    },
    retention: {
      heading: "How long we keep it",
      body: "For as long as your account is active. If you ask us to delete it, we remove your personal data, vehicles, and trip history. We may keep aggregated statistics that no longer identify you.",
    },
    rights: {
      heading: "Your rights",
      before: "The",
      lawNameBold: "Law 18.331 on the Protection of Personal Data",
      afterLawBeforeEmail:
        "of Uruguay gives you the right to access your data, correct it, update it, and request its deletion. Write to us at",
      afterEmail: "and we'll respond within the timeframes set by law.",
      complaint:
        "If you feel we didn't handle your request properly, you can file a complaint with Uruguay's Personal Data Regulation and Control Unit (URCDP).",
    },
    cookies: {
      heading: "Cookies and analytics",
      body: "RouteEV doesn't use advertising or cross-site tracking cookies. To keep you signed in, we store an identifier in your own browser, which is required for login to work and gets deleted when you sign out. If we add analytics tools that require your consent in the future, we'll ask for it before turning them on.",
    },
    changes: {
      heading: "Changes to this policy",
      body: "If something important changes, we update the date in the header and, if the change affects you directly, we'll let you know.",
    },
    note: "This document describes how RouteEV works in practice and is deliberately written in plain language. It doesn't replace legal advice.",
  },
  terms: {
    pageTitle: "Terms and Conditions",
    metaDescription:
      "RouteEV's terms of use: what the service guarantees, what it doesn't, and why range estimates don't replace your own judgment while driving.",
    lastUpdated: "Last updated: August 4, 2026",
    summaryBefore: "The most important thing on this page, if you read nothing else:",
    summaryBold: "RouteEV's routes and battery estimates are approximate.",
    summaryAfter:
      "An electric vehicle's real-world range depends on weather, speed, load, battery condition, and how you drive. Always keep a safety margin and confirm charger availability before you head out.",
    whatIs: {
      heading: "What RouteEV is",
      body: "A free service that estimates routes for electric vehicles in Uruguay, calculating battery consumption leg by leg and suggesting charging stops. It's a project in active development: bugs and changing features can appear.",
    },
    usage: {
      heading: "Using the service",
      items: {
        free: "You can use RouteEV to plan your trips, at no cost.",
        account: "You're responsible for your account's activity and for keeping your password safe.",
        noAbuse:
          "Automating mass queries, attempting to overload the service, or scraping the full database is not allowed.",
        suspend: "We may suspend accounts that misuse the service.",
      },
    },
    accuracy: {
      heading: "About the accuracy of the information",
      intro:
        "Vehicle data comes from factory specifications, and charging station locations from public sources. Neither is infallible:",
      item1Bold: "Real-world range almost never matches the factory figure.",
      item1Rest: "Cold weather, speed, air conditioning, vehicle load, and battery age all reduce it.",
      item2Bold: "RouteEV doesn't know whether a charger is currently occupied or out of service.",
      item2Rest: "Always confirm through another channel before counting on a stop.",
      item3: "Routes are calculated on road data that may be out of date relative to the real road.",
      responsibleBold: "Driving safely is always your responsibility.",
      responsibleRest: "Don't use the app while driving, and follow road signage and traffic laws.",
    },
    liability: {
      heading: "Limitation of liability",
      body: "RouteEV is provided \"as is\", without warranty of continuous availability or accuracy. To the extent permitted by law, we're not liable for damages arising from use of the service, including running out of battery, arriving at a charger that isn't working, delays, or travel expenses. The final decision on when and where to charge is yours.",
    },
    ip: {
      heading: "Intellectual property",
      part1: "The code, design, and RouteEV brand belong to RouteEV. Map data comes from",
      osmLabel: "OpenStreetMap",
      part2: ", under the ODbL license, and base maps from",
      cartoLabel: "CARTO",
      part3:
        "; both are credited on every map in the app. The Inter and JetBrains Mono typefaces are used under their open licenses.",
    },
    accounts: {
      heading: "Accounts and cancellation",
      before: "You can stop using the service whenever you want and ask us to delete your account by writing to",
      afterEmailBeforeLink: ". How we handle your data is described in the",
      privacyLinkLabel: "Privacy Policy",
      after: ".",
    },
    changes: {
      heading: "Changes",
      body: "We may update these terms as the product evolves. The date in the header shows the latest version.",
    },
    law: {
      heading: "Governing law",
      body: "These terms are governed by the law of the Oriental Republic of Uruguay.",
    },
    note: "This document is deliberately written in plain language and describes how the service works. It doesn't replace legal advice.",
  },
};
