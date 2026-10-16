export const auth = {
  meta: {
    titleLogin: "RouteEV · Iniciar sesión",
    titleSignup: "RouteEV · Crear cuenta",
  },
  header: {
    logoLabel: "RouteEV, ir al inicio",
    backHome: "Volver al inicio",
    backHomeShort: "Inicio",
    language: "Idioma",
  },
  // El control segmentado de arriba de la tarjeta (solo en esos dos pasos).
  mode: {
    label: "Iniciar sesión o crear cuenta",
    login: "Iniciar sesión",
    signup: "Crear cuenta",
  },
  backToLogin: "Volver a iniciar sesión",
  fields: {
    email: "Correo electrónico",
    emailPlaceholder: "nombre@dominio.com",
    password: "Contraseña",
    newPassword: "Contraseña nueva",
    repeatPassword: "Repetí la contraseña nueva",
    name: "Nombre",
    optional: "(opcional)",
    namePlaceholder: "Marcela",
    nameHint:
      "Es cómo te mostramos en la app. Si lo dejás vacío te ponemos uno, y lo cambiás cuando quieras desde tu perfil.",
    code: "Código de 6 dígitos",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
  },
  // El mínimo se dice antes de escribir, no recién al equivocarse.
  passwordRule: {
    empty: "Mínimo 10 caracteres.",
    missing: (n: number) => `Mínimo 10 caracteres · ${n === 1 ? "te falta 1" : `te faltan ${n}`}.`,
    ok: "Cumple el mínimo de 10 caracteres.",
  },
  errors: {
    email: "Ingresá un correo válido, como nombre@dominio.com.",
    passwordEmpty: "Ingresá tu contraseña.",
    passwordShort: "La contraseña necesita al menos 10 caracteres.",
    code: "El código tiene 6 dígitos.",
    mismatch: "Las contraseñas no coinciden.",
    // Respaldo cuando la API no manda un texto propio.
    generic: "No se pudo completar la operación",
    google: "No se pudo iniciar sesión con Google",
    confirm: "No se pudo confirmar el correo",
    resend: "No se pudo reenviar el código",
    forgot: "No se pudo enviar el código",
    verify: "No se pudo verificar el código",
    reset: "No se pudo restablecer la contraseña",
  },
  notices: {
    unconfirmed:
      "Tu correo todavía no está confirmado. Si no tenés el código a mano, pedí que te lo reenviemos.",
    resent:
      "Te reenviamos el código. Puede tardar unos minutos en llegar; el anterior ya no sirve.",
  },
  slow: "El servidor se está despertando. La primera vez puede tardar hasta un minuto: no cierres la página.",
  forgotLink: "¿Olvidaste tu contraseña?",
  resend: "Reenviar código",
  newCode: "Pedir otro código",
  google: {
    divider: "o",
  },
  terms: {
    before: "Al crear la cuenta aceptás los ",
    terms: "Términos",
    middle: " y la ",
    privacy: "Política de privacidad",
    after: ".",
  },
  footer: {
    privacy: "Privacidad",
    terms: "Términos",
  },
  steps: {
    login: { title: "Entrá a tu cuenta", submit: "Entrar", busy: "Entrando…" },
    signup: {
      title: "Creá tu cuenta",
      subtitle: "Para guardar tus autos, ver tus viajes y calificar estaciones.",
      submit: "Crear cuenta",
      busy: "Creando la cuenta…",
    },
    confirm: {
      eyebrow: "Crear cuenta · último paso",
      title: "Confirmá tu correo",
      before: "Te mandamos un código de 6 dígitos a ",
      after: ". Puede tardar unos minutos en llegar.",
      submit: "Confirmar",
      busy: "Confirmando…",
    },
    forgot: {
      eyebrow: "Recuperar contraseña · paso 1 de 3",
      title: "Recuperá tu contraseña",
      subtitle: "Escribí tu correo y te mandamos un código para elegir una nueva.",
      submit: "Enviar código",
      busy: "Enviando…",
    },
    // "Si {correo} tiene una cuenta": el paso aparece exista o no la cuenta,
    // así la pantalla no delata qué correos están registrados.
    code: {
      eyebrow: "Recuperar contraseña · paso 2 de 3",
      title: "Revisá tu correo",
      before: "Si ",
      after:
        " tiene una cuenta, te mandamos un código de 6 dígitos. Puede tardar unos minutos en llegar.",
      submit: "Verificar código",
      busy: "Verificando…",
    },
    newpass: {
      eyebrow: "Recuperar contraseña · paso 3 de 3",
      title: "Elegí tu contraseña nueva",
      subtitle: "Código verificado. Cuando la guardes, entrás directo.",
      submit: "Guardar y entrar",
      busy: "Guardando…",
    },
  },
};
