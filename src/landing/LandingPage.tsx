import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { getToken } from "../api/session";
import buttons from "../shared/buttons.module.css";
import { GradientWaves } from "../shared/GradientWaves";
import { Reveal } from "../shared/Reveal";
import { SiteFooter } from "../shared/SiteFooter";
import { SiteHeader } from "../shared/SiteHeader";
import { UruguayGraph } from "../shared/UruguayGraph";
import { StatCard } from "./StatCard";
import styles from "./LandingPage.module.css";

const STATS = [
  {
    value: 63800,
    places: [10000, 1000, ".", 100, 10, 1] as const,
    suffix: "+",
    label: "Intersecciones reales de OpenStreetMap",
  },
  { value: 19, label: "Departamentos cubiertos" },
  { value: 209, label: "Estaciones de carga UTE en el mapa" },
  { value: 895, label: "Modelos de auto eléctrico precargados" },
];

const HOW_IT_WORKS = [
  {
    title: "Cargá tu vehículo",
    body: "Elegí un modelo real de un catálogo de autos eléctricos (Nissan Leaf, Tesla, BYD, y más) o cargá los datos de batería y consumo a mano.",
  },
  {
    title: "Marcá origen y destino",
    body: "Hacé click en el mapa, escribí una dirección, o elegí de una lista de intersecciones reales.",
  },
  {
    title: "Se calcula la ruta",
    body: "El sistema busca el camino más eficiente para tu auto, revisando la batería arista por arista y sumando recargas si hacen falta.",
  },
  {
    title: "Mirá los datos del viaje",
    body: "Distancia, tiempo, energía, peajes, y cada parada de carga con su dirección y potencia real.",
  },
];

export function LandingPage() {
  const loggedIn = Boolean(getToken());

  return (
    <div className={styles.page}>
      <Helmet>
        <title>RouteEV — Planificá viajes en auto eléctrico por Uruguay</title>
        <meta
          name="description"
          content="Calculá si tu auto eléctrico llega, y dónde parar a cargar, sobre el mapa vial real de Uruguay y las 209 estaciones de UTE. 895 modelos precargados, sin crear cuenta."
        />
        <link rel="canonical" href="https://routeev.uy/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_UY" />
        <meta property="og:site_name" content="RouteEV" />
        <meta property="og:url" content="https://routeev.uy/" />
        <meta property="og:title" content="¿Llega tu auto eléctrico? Fijate antes de salir." />
        <meta
          property="og:description"
          content="Elegí uno de 895 modelos, marcá origen y destino, y RouteEV te dice si llegás, dónde cargar y cuánto sale. Sobre el mapa real de Uruguay."
        />
        <meta property="og:image" content="https://routeev.uy/img/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "RouteEV",
            url: "https://routeev.uy/",
            description:
              "Planificador de viajes para vehículos eléctricos en Uruguay: calcula si tu auto llega, dónde parar a cargar y cuánto cuesta, sobre el mapa vial real del país.",
            applicationCategory: "TravelApplication",
            operatingSystem: "Any (web)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "UYU" },
            areaServed: { "@type": "Country", name: "Uruguay" },
            author: { "@type": "Organization", name: "RouteEV", email: "routemindtbo@gmail.com" },
          })}
        </script>
      </Helmet>

      <SiteHeader navLinks={[{ href: "/showroom", label: "Showroom" }, { href: "#como-funciona", label: "Cómo funciona" }, { href: "#datos-reales", label: "Datos reales" }]}>
        {loggedIn ? (
          <Link to="/app" className={buttons.primary}>
            Ir a la app
          </Link>
        ) : (
          <>
            <Link to="/login" className={buttons.navLink}>
              Iniciar sesión
            </Link>
            <Link to="/login?crear=1" className={buttons.primary}>
              Crear cuenta
            </Link>
          </>
        )}
      </SiteHeader>

      <main>
        <section className={styles.heroWrap}>
          <GradientWaves
            horizonColor="#0a0e13"
            waveColor="#1a212c"
            crestColor="#34e3a8"
            speed={0.3}
            amplitude={2}
            opacity={0.85}
            brightness={0.9}
            grainIntensity={0.035}
          />
          <div className={[styles.section, styles.hero].join(" ")}>
            <div>
              <p className={styles.eyebrow}>Movilidad eléctrica</p>
              <h1>
                Tu viaje por Uruguay
                <br />
                no se detiene; tu batería tampoco.
              </h1>
              <p className={styles.heroSub}>
                RouteEV calcula la ruta más eficiente para tu vehículo eléctrico sobre el mapa vial real del
                país, revisando tu batería tramo a tramo y sumando las paradas de carga que hagan falta en el
                camino.
              </p>
              <div className={styles.heroActions}>
                <Link to="/showroom" className={[buttons.primary, buttons.large].join(" ")}>
                  Ver el catálogo y simular un viaje
                </Link>
                <Link to="/login?crear=1" className={[buttons.ghost, buttons.large].join(" ")}>
                  Crear cuenta gratis
                </Link>
              </div>
              <p className={styles.heroNote}>
                El catálogo no pide cuenta: entrás, elegís un auto y calculás el viaje.
              </p>
            </div>

            <div className={styles.heroVisual}>
              <UruguayGraph />
              <p className={styles.heroVisualCaption}>Montevideo → Rivera · 497 km, 1 parada de carga</p>
            </div>
          </div>
        </section>

        <Reveal id="datos-reales" className={[styles.section, styles.stats].join(" ")}>
          {STATS.map((stat, i) => (
            <StatCard
              key={stat.label}
              index={i}
              value={stat.value}
              places={stat.places ? [...stat.places] : undefined}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </Reveal>

        <Reveal className={[styles.section, styles.split].join(" ")}>
          <div>
            <p className={styles.eyebrow}>El problema</p>
            <h2>La autonomía real no es la del folleto.</h2>
            <p>
              Un vehículo eléctrico rinde distinto en cada calle: el tráfico, la velocidad y el propio
              consumo del auto cambian cuánta batería queda al llegar. Los mapas comunes calculan el camino
              más corto o más rápido, pero ninguno te avisa si esa ruta es la que tu batería puede hacer, ni
              dónde parar a cargar si no.
            </p>
          </div>
          <div>
            <p className={styles.eyebrow}>La solución</p>
            <h2>Un motor de rutas que entiende de baterías.</h2>
            <p>
              RouteEV construye el camino sobre el grafo vial real del país (no una aproximación): cada
              calle pesa lo que realmente cuesta recorrerla, y el sistema revisa tu batería antes de cada
              tramo. Si no alcanza, busca una estación de carga real en el camino, sin que tengas que
              planearlo vos.
            </p>
          </div>
        </Reveal>

        <Reveal className={[styles.section, styles.showroom].join(" ")}>
          <div>
            <p className={styles.eyebrow}>Showroom · sin cuenta</p>
            <h2>Antes de comprarlo, fijate si llega.</h2>
            <p>
              Buscá cualquiera de los 895 autos eléctricos del catálogo y mirá sus números de verdad:
              batería, autonomía real, consumo, cuánto cuesta cada 100 km en pesos y cuánto tarda en cargar
              en las estaciones que existen en Uruguay.
            </p>
            <p>
              Y con el auto elegido, calculá un viaje concreto como si lo pidieras desde el mapa: el mismo
              motor de rutas devuelve la distancia, el tiempo, la batería con la que llegás, los peajes, el
              costo total y en qué estación de carga hay que parar, con su dirección y su potencia.
            </p>
            <Link to="/showroom" className={[buttons.primary, buttons.large].join(" ")}>
              Entrar al showroom
            </Link>
          </div>
          <ul className={styles.showroomSteps}>
            <li>
              <span className={styles.stepNum}>01</span> Buscás el modelo por su nombre
            </li>
            <li>
              <span className={styles.stepNum}>02</span> Ves su ficha completa, con foto
            </li>
            <li>
              <span className={styles.stepNum}>03</span> Elegís desde dónde y hasta dónde
            </li>
            <li>
              <span className={styles.stepNum}>04</span> Te dice si llega, y dónde para a cargar
            </li>
          </ul>
        </Reveal>

        <Reveal id="como-funciona" className={[styles.section, styles.steps].join(" ")}>
          <p className={[styles.eyebrow, styles.eyebrowCenter].join(" ")}>Cómo funciona</p>
          <h2 className={styles.stepsTitle}>Cuatro pasos, un viaje calculado.</h2>
          <ol className={styles.stepsList}>
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className={[styles.section, styles.finalCta].join(" ")}>
          <h2>Probalo con tu auto.</h2>
          <p>Elegí un modelo, marcá un viaje que hagas de verdad y fijate si llega. No pide cuenta.</p>
          <div className={[styles.heroActions, styles.heroActionsCenter].join(" ")}>
            <Link to="/showroom" className={[buttons.primary, buttons.large].join(" ")}>
              Calcular un viaje
            </Link>
            <Link to="/login?crear=1" className={[buttons.ghost, buttons.large].join(" ")}>
              Crear cuenta gratis
            </Link>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
