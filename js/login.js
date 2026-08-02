(function () {
  if (getToken()) {
    window.location.href = "/app";
    return;
  }

  const form = document.getElementById("login-form");
  const errorBanner = document.getElementById("error-banner");
  const submitBtn = document.getElementById("submit-btn");
  const toggleModeBtn = document.getElementById("toggle-mode");
  const modeLabel = document.getElementById("mode-label");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  let mode = "login";

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove("hidden");
  }

  function clearError() {
    errorBanner.classList.add("hidden");
  }

  function setMode(newMode) {
    mode = newMode;
    modeLabel.textContent = mode === "login" ? "Iniciar sesion" : "Crear cuenta";
    submitBtn.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
    toggleModeBtn.textContent = mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta";
  }

  toggleModeBtn.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
    clearError();
    usernameInput.focus();
  });

  // La landing (y el footer/CTA) enlazan a /login?crear=1 para arrancar
  // directo en modo "crear cuenta" en vez de forzar un click extra.
  if (new URLSearchParams(location.search).get("crear") === "1") {
    setMode("register");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Espejo de las reglas de backend/app/schemas.py. Esto es solo para dar un
    // mensaje inmediato y claro: la validacion que realmente cuenta es la del
    // servidor, porque cualquiera puede llamar a la API sin pasar por esta
    // pantalla.
    if (username.length < 3) {
      showError("El usuario necesita al menos 3 caracteres.");
      return;
    }
    if (mode === "register" && !/^[A-Za-z0-9._-]+$/.test(username)) {
      showError("El usuario solo puede tener letras, numeros, puntos, guiones y guiones bajos.");
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
      const result = mode === "login" ? await api.login(username, password) : await api.register(username, password);
      setSession(result.access_token, result.username);
      window.location.href = "/app";
    } catch (err) {
      showError(err.message || "No se pudo completar la operacion");
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
    }
  });

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
    if (!cfg.google_client_id || typeof google === "undefined") return;

    google.accounts.id.initialize({
      client_id: cfg.google_client_id,
      callback: async (response) => {
        clearError();
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
