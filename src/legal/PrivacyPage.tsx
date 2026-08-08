import { LegalLayout } from "./LegalLayout";
import styles from "./LegalLayout.module.css";

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      description="Qué datos recoge RouteEV, para qué los usa, cuánto los conserva y cómo ejercer tus derechos según la Ley 18.331 de Uruguay."
    >
      <h1>Política de Privacidad</h1>
      <p className={styles.fecha}>Última actualización: 4 de agosto de 2026</p>

      <p className={styles.resumen}>
        En resumen: RouteEV te pide lo mínimo para que la aplicación funcione, no vende tus datos a nadie y
        no te muestra publicidad. Podés usar el showroom y calcular un viaje entero sin crear una cuenta ni
        darnos ningún dato.
      </p>

      <h2>Quién es responsable de tus datos</h2>
      <p>
        RouteEV es un proyecto desarrollado en Montevideo, Uruguay. Para cualquier consulta sobre tus datos
        personales podés escribir a <a href="mailto:routemindtbo@gmail.com">routemindtbo@gmail.com</a>.
      </p>

      <h2>Qué datos recogemos</h2>
      <p>Depende de cómo uses el servicio.</p>

      <h3>Si no creás una cuenta</h3>
      <p>
        No recogemos ningún dato personal. El catálogo de vehículos y el simulador de viajes funcionan sin
        identificarte. Los orígenes y destinos que elegís se procesan para devolverte la ruta y no quedan
        asociados a ninguna persona.
      </p>

      <h3>Si creás una cuenta</h3>
      <ul>
        <li>
          <strong>Nombre de usuario y contraseña.</strong> La contraseña se guarda cifrada: ni nosotros
          podemos leerla.
        </li>
        <li>
          <strong>Tus vehículos.</strong> Modelo, capacidad de batería, consumo y, si la subís, una foto del
          vehículo.
        </li>
        <li>
          <strong>Tu historial de viajes.</strong> Orígenes, destinos, distancias y consumo de los viajes
          que guardás.
        </li>
      </ul>

      <h3>Si entrás con Google</h3>
      <p>
        Google nos comparte tu dirección de correo y tu nombre para crear la cuenta. No recibimos tu
        contraseña de Google ni tenemos acceso a ningún otro dato de tu cuenta de Google.
      </p>

      <h3>Si usás el seguimiento de viaje en la aplicación móvil</h3>
      <p>
        La aplicación usa tu ubicación mientras el viaje está activo, incluso con la pantalla bloqueada,
        para calcular tu progreso y la batería restante. Esa ubicación se procesa en tu teléfono y no se
        envía a nuestros servidores salvo que guardes el viaje. Podés revocar el permiso desde los ajustes
        del teléfono en cualquier momento.
      </p>

      <h2>Para qué usamos los datos</h2>
      <ul>
        <li>Para que puedas iniciar sesión y encontrar tus vehículos y viajes.</li>
        <li>Para calcular rutas ajustadas a tu vehículo.</li>
        <li>
          Para entender qué partes del producto se usan y cuáles no, con estadísticas agregadas que no
          identifican a nadie.
        </li>
      </ul>
      <p>
        <strong>No vendemos ni cedemos tus datos personales a terceros</strong>, ni los usamos para
        publicidad.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Solo con los proveedores que hacen falta para que el servicio funcione: el proveedor de
        infraestructura donde corre la aplicación, y Google si elegís entrar con tu cuenta de Google.
        Ninguno los usa para fines propios.
      </p>

      <h2>Cuánto los conservamos</h2>
      <p>
        Mientras tengas la cuenta activa. Si pedís que la borremos, eliminamos tus datos personales,
        vehículos e historial de viajes. Podemos conservar estadísticas agregadas que ya no permiten
        identificarte.
      </p>

      <h2>Tus derechos</h2>
      <p>
        La <strong>Ley 18.331 de Protección de Datos Personales</strong> de Uruguay te da derecho a acceder
        a tus datos, corregirlos, actualizarlos y pedir que se eliminen. Escribinos a{" "}
        <a href="mailto:routemindtbo@gmail.com">routemindtbo@gmail.com</a> y respondemos dentro de los
        plazos que fija la ley.
      </p>
      <p>
        Si considerás que no atendimos bien tu pedido, podés reclamar ante la Unidad Reguladora y de
        Control de Datos Personales (URCDP).
      </p>

      <h2>Cookies y medición</h2>
      <p>
        RouteEV no usa cookies de publicidad ni de seguimiento entre sitios. Para mantener tu sesión
        iniciada se guarda un identificador en tu propio navegador, que es imprescindible para que el login
        funcione y se borra cuando cerrás sesión. Si en el futuro sumamos herramientas de medición que
        requieran tu consentimiento, te lo vamos a pedir antes de activarlas.
      </p>

      <h2>Cambios en esta política</h2>
      <p>
        Si cambia algo importante, actualizamos la fecha del encabezado y, si el cambio te afecta
        directamente, te avisamos.
      </p>

      <p className={styles.nota}>
        Este documento describe cómo funciona RouteEV en la práctica y está escrito en lenguaje claro a
        propósito. No sustituye asesoramiento legal.
      </p>
    </LegalLayout>
  );
}
