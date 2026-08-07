import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";
import styles from "./LegalLayout.module.css";

export function TermsPage() {
  return (
    <LegalLayout
      title="Términos y Condiciones"
      description="Condiciones de uso de RouteEV: qué garantiza el servicio, qué no, y por qué las estimaciones de autonomía no reemplazan tu propio criterio al manejar."
    >
      <h1>Términos y Condiciones</h1>
      <p className={styles.fecha}>Última actualización: 4 de agosto de 2026</p>

      <p className={styles.resumen}>
        Lo más importante de esta página, si no leés nada más:{" "}
        <strong>las rutas y estimaciones de batería de RouteEV son orientativas.</strong> La autonomía real
        de un vehículo eléctrico depende del clima, la velocidad, la carga, el estado de la batería y cómo
        manejás. Usá siempre un margen de seguridad y confirmá la disponibilidad de los cargadores antes de
        salir.
      </p>

      <h2>Qué es RouteEV</h2>
      <p>
        Un servicio gratuito que estima rutas para vehículos eléctricos en Uruguay, calculando el consumo
        de batería tramo a tramo y sugiriendo paradas de carga. Es un proyecto en desarrollo activo: pueden
        aparecer errores y funcionalidades que cambian.
      </p>

      <h2>Uso del servicio</h2>
      <ul>
        <li>Podés usar RouteEV para planificar tus viajes, sin costo.</li>
        <li>Sos responsable de la actividad de tu cuenta y de mantener tu contraseña a resguardo.</li>
        <li>
          No está permitido automatizar consultas masivas, intentar sobrecargar el servicio, ni extraer la
          base de datos completa.
        </li>
        <li>Podemos suspender cuentas que hagan un uso abusivo del servicio.</li>
      </ul>

      <h2>Sobre la exactitud de la información</h2>
      <p>
        Los datos de vehículos provienen de especificaciones de fábrica, y la ubicación de las estaciones
        de carga de fuentes públicas. Ni unos ni otros son infalibles:
      </p>
      <ul>
        <li>
          <strong>La autonomía real casi nunca coincide con la de fábrica.</strong> El frío, la velocidad,
          el aire acondicionado, la carga del vehículo y la antigüedad de la batería la reducen.
        </li>
        <li>
          <strong>RouteEV no sabe si un cargador está ocupado o fuera de servicio en este momento.</strong>{" "}
          Confirmá siempre por otra vía antes de contar con una parada.
        </li>
        <li>Las rutas se calculan sobre datos viales que pueden estar desactualizados respecto de la realidad de la ruta.</li>
      </ul>
      <p>
        <strong>Manejar con seguridad es siempre tu responsabilidad.</strong> No uses la aplicación
        mientras conducís y respetá la señalización y las normas de tránsito.
      </p>

      <h2>Limitación de responsabilidad</h2>
      <p>
        RouteEV se ofrece «tal cual», sin garantía de disponibilidad continua ni de exactitud. En la medida
        que lo permita la ley, no nos hacemos responsables por perjuicios derivados del uso del servicio,
        incluidos quedarse sin batería, llegar a un cargador que no funciona, demoras o gastos de traslado.
        La decisión final sobre cuándo y dónde cargar es tuya.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        El código, el diseño y la marca RouteEV pertenecen a RouteEV. Los datos cartográficos provienen de{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
          OpenStreetMap
        </a>
        , bajo licencia ODbL, y los mapas base de{" "}
        <a href="https://carto.com/attributions" target="_blank" rel="noopener">
          CARTO
        </a>
        ; ambos están acreditados en cada mapa de la aplicación. Las tipografías Inter y JetBrains Mono se
        usan bajo sus licencias libres.
      </p>

      <h2>Cuentas y baja</h2>
      <p>
        Podés dejar de usar el servicio cuando quieras y pedir que borremos tu cuenta escribiendo a{" "}
        <a href="mailto:routemindtbo@gmail.com">routemindtbo@gmail.com</a>. El tratamiento de tus datos
        está descrito en la <Link to="/privacidad">Política de Privacidad</Link>.
      </p>

      <h2>Cambios</h2>
      <p>
        Podemos actualizar estos términos a medida que el producto evoluciona. La fecha del encabezado
        indica la última versión.
      </p>

      <h2>Ley aplicable</h2>
      <p>Estos términos se rigen por la legislación de la República Oriental del Uruguay.</p>

      <p className={styles.nota}>
        Este documento está escrito en lenguaje claro a propósito y describe cómo funciona el servicio. No
        sustituye asesoramiento legal.
      </p>
    </LegalLayout>
  );
}
