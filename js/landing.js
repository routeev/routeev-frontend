(function () {
  // Si ya hay sesion iniciada, la landing lleva directo a la app en vez de
  // insistir con "crear cuenta".
  if (typeof getToken === "function" && getToken()) {
    const loginLink = document.getElementById("nav-login-link");
    const registerLink = document.getElementById("nav-register-link");
    if (loginLink) {
      loginLink.textContent = "Ir a la app";
      loginLink.href = "/app";
    }
    if (registerLink) {
      registerLink.textContent = "Ir a la app";
      registerLink.href = "/app";
    }
    document.querySelectorAll('a[href^="/login"]').forEach((a) => {
      a.href = "/app";
      if (/crear cuenta/i.test(a.textContent)) a.textContent = "Ir a la app";
    });
  }

  // Revelado progresivo al hacer scroll (respeta prefers-reduced-motion via
  // la regla global en style.css, que desactiva animaciones/transiciones).
  const revealTargets = document.querySelectorAll(".l-reveal");
  if ("IntersectionObserver" in window && revealTargets.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("l-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("l-revealed"));
  }
})();
