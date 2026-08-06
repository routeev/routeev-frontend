(function () {
  if (getToken()) {
    window.location.href = "/app";
    return;
  }

  const loginView = document.getElementById("login-view");
  const confirmView = document.getElementById("confirm-view");
  const form = document.getElementById("login-form");
  const errorBanner = document.getElementById("error-banner");
  const infoBanner = document.getElementById("info-banner");
  const submitBtn = document.getElementById("submit-btn");
  const toggleModeBtn = document.getElementById("toggle-mode");
  const modeLabel = document.getElementById("mode-label");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const confirmForm = document.getElementById("confirm-form");
  const confirmCopy = document.getElementById("confirm-copy");
  const confirmCodeInput = document.getElementById("confirm-code");
  const confirmSubmitBtn = document.getElementById("confirm-submit-btn");
  const resendCodeBtn = document.getElementById("resend-code-btn");
  const backToLoginBtn = document.getElementById("back-to-login-btn");

  let mode = "login";
  // Correo pendiente de confirmacion mientras se muestra confirm-view (el
  // que vino en la respuesta del backend, no lo que haya en el input de
  // login -- puede haber cambiado de vista de por medio).
  let pendingConfirmEmail = null;

  function showError(msg) {
    infoBanner.classList.add("hidden");
    errorBanner.textContent = msg;
    errorBanner.classList.remove("hidden");
  }

  function showInfo(msg) {
    errorBanner.classList.add("hidden");
    infoBanner.textContent = msg;
    infoBanner.classList.remove("hidden");
  }

  function clearBanners() {
    errorBanner.classList.add("hidden");
    infoBanner.classList.add("hidden");
  }

  function setMode(newMode) {
    mode = newMode;
    modeLabel.textContent = mode === "login" ? "Iniciar sesion" : "Crear cuenta";
    submitBtn.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
    toggleModeBtn.textContent = mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta";
    // El minimo de 10 caracteres solo aplica a cuentas nuevas (ver el chequeo
    // en el submit). Ponerlo como minlength fijo en el HTML bloqueaba el
    // login nativo del navegador para cualquier cuenta vieja con contraseña
    // mas corta, antes de que el JS de abajo llegue a correr. Por eso se
    // setea aca, solo en modo registro, y se saca al volver a login.
    passwordInput.minLength = mode === "register" ? 10 : 0;
    passwordInput.autocomplete = mode === "register" ? "new-password" : "current-password";
  }

  // Muestra el paso de "ingresa el codigo que te mandamos" y esconde el
  // formulario de login/registro. Se llega aca desde dos lugares: un
  // registro con confirmation_required=true, o un login que pega contra una
  // cuenta valida pero todavia sin confirmar (ver el 403 mas abajo).
  function showConfirmView(email) {
    pendingConfirmEmail = email;
    confirmCodeInput.value = "";
    confirmCopy.textContent = `Te mandamos un codigo de 6 digitos a ${email}. Ingresalo para confirmar tu cuenta.`;
    modeLabel.textContent = "Confirma tu correo";
    loginView.classList.add("hidden");
    confirmView.classList.remove("hidden");
  }

  function showLoginView() {
    pendingConfirmEmail = null;
    confirmView.classList.add("hidden");
    loginView.classList.remove("hidden");
    setMode(mode);
    clearBanners();
  }

  toggleModeBtn.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
    clearBanners();
    emailInput.focus();
  });

  backToLoginBtn.addEventListener("click", () => {
    showLoginView();
    emailInput.focus();
  });

  // La landing (y el footer/CTA) enlazan a /login?crear=1 para arrancar
  // directo en modo "crear cuenta" en vez de forzar un click extra.
  if (new URLSearchParams(location.search).get("crear") === "1") {
    setMode("register");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearBanners();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Espejo de las reglas de backend/app/schemas.py. Esto es solo para dar un
    // mensaje inmediato y claro: la validacion que realmente cuenta es la del
    // servidor (EmailStr), porque cualquiera puede llamar a la API sin pasar
    // por esta pantalla.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("Ingresa un correo electronico valido.");
      return;
    }
    // Al entrar no se exige el minimo actual: las cuentas creadas antes de que
    // subiera pueden tener contraseñas mas cortas y tienen que poder entrar.
    if (mode === "register" && password.length < 10) {
      showError("La contraseña necesita al menos 10 caracteres.");
      return;
    }
    if (!password) {
      showError("Escribi tu contraseña.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Un momento...";
    try {
      const result = mode === "login" ? await api.login(email, password) : await api.register(email, password);
      if (result.confirmation_required) {
        // Cuenta creada pero todavia sin token: falta el codigo de
        // confirmacion que se acaba de mandar por mail (ver RegisterResponse
        // en backend/app/schemas.py).
        showConfirmView(result.email);
        submitBtn.disabled = false;
        submitBtn.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
        return;
      }
      setSession(result.access_token, result.username);
      window.location.href = "/app";
    } catch (err) {
      if (mode === "login" && err.status === 403) {
        // Credenciales correctas pero el correo todavia no fue confirmado: en
        // vez de dejar a quien intento entrar sin salida, lo mandamos directo
        // al paso de confirmacion, con la opcion de reenviar el codigo.
        showConfirmView(email);
        showInfo("Tu correo todavia no esta confirmado. Si no tenes el codigo a mano, pedi que te lo reenviemos.");
      } else {
        showError(err.message || "No se pudo completar la operacion");
      }
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
    }
  });

  confirmForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearBanners();

    const code = confirmCodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      showError("El codigo tiene 6 digitos.");
      return;
    }

    confirmSubmitBtn.disabled = true;
    confirmSubmitBtn.textContent = "Confirmando...";
    try {
      const result = await api.confirmEmail(pendingConfirmEmail, code);
      setSession(result.access_token, result.username);
      window.location.href = "/app";
    } catch (err) {
      showError(err.message || "No se pudo confirmar el correo");
      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = "Confirmar";
    }
  });

  resendCodeBtn.addEventListener("click", async () => {
    clearBanners();
    resendCodeBtn.disabled = true;
    try {
      await api.resendConfirmation(pendingConfirmEmail);
      showInfo("Te reenviamos el codigo. Puede tardar unos minutos en llegar.");
    } catch (err) {
      showError(err.message || "No se pudo reenviar el codigo");
    } finally {
      resendCodeBtn.disabled = false;
    }
  });

  // El script de Google (<script src="https://accounts.google.com/gsi/client"
  // async> en login.html) es "async" a proposito, para no bloquear el resto
  // de la pagina -- pero eso significa que puede terminar de cargar DESPUES
  // de que este archivo se ejecute. Un solo chequeo de "typeof google" en ese
  // momento es una carrera: si perdemos la carrera, el boton no aparece
  // aunque el script cargue bien un instante despues, porque nadie vuelve a
  // intentarlo. Se espera un rato corto en vez de chequear una unica vez.
  function waitForGoogleIdentityServices(timeoutMs = 4000) {
    if (typeof google !== "undefined") return Promise.resolve(true);
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (typeof google !== "undefined") {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(false); // script bloqueado o muy lento: sin boton, el login usuario/contraseña sigue andando igual
        }
      }, 50);
    });
  }

  // "Iniciar sesion con Google": el boton solo aparece si el servidor tiene
  // un Client ID configurado (ver /api/auth/config). Sin eso, esta consulta
  // simplemente no muestra nada mas -- el login usuario/contraseña sigue
  // funcionando igual.
  async function setupGoogleSignIn() {
    let cfg;
    try {
      cfg = await api.authConfig();
    } catch (e) {
      return; // sin conexion o backend viejo: no rompemos el login normal por esto
    }
    if (!cfg.google_client_id) return;
    if (!(await waitForGoogleIdentityServices())) return;

    google.accounts.id.initialize({
      client_id: cfg.google_client_id,
      callback: async (response) => {
        clearBanners();
        try {
          const result = await api.googleLogin(response.credential);
          setSession(result.access_token, result.username);
          window.location.href = "/app";
        } catch (err) {
          showError(err.message || "No se pudo iniciar sesion con Google");
        }
      },
    });
    document.getElementById("google-divider").classList.remove("hidden");
    google.accounts.id.renderButton(document.getElementById("google-signin-btn"), {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      width: 320,
    });
  }
  setupGoogleSignIn();
})();
