/**
 * Pantalla de perfil: historial de viajes calculados y promedios mensuales,
 * a partir de lo que ya quedo guardado en route_history por cada
 * "Calcular ruta" (ver database.save_route_history).
 */

(function () {
  if (!getToken()) {
    window.location.href = "/login";
    return;
  }

  document.getElementById("user-chip").textContent = getUsername() || "usuario";
  document.getElementById("logout-btn").addEventListener("click", () => {
    clearSession();
    window.location.href = "/";
  });

  // --- Mi cuenta: foto de perfil -----------------------------------------------
  //
  // A diferencia de la foto de un vehiculo (blob privado, se pide con fetch()
  // + Authorization), la de perfil vive en Cloudinary y es publica: se puede
  // poner directo en el <img src>, sin pasar por api.vehiclePhotoUrl.

  const accountAvatarImg = document.getElementById("account-avatar");
  const accountAvatarFallback = document.getElementById("account-avatar-fallback");
  const accountPhotoInput = document.getElementById("account-photo-input");
  const accountRemovePhotoBtn = document.getElementById("account-remove-photo");
  const accountPhotoError = document.getElementById("account-photo-error");

  function renderAccount(user) {
    document.getElementById("account-username").textContent = user.username;
    document.getElementById("account-email").textContent = user.email;
    document.getElementById("user-chip").textContent = user.username;

    if (user.photo_url) {
      accountAvatarImg.src = user.photo_url;
      accountAvatarImg.classList.remove("hidden");
      accountAvatarFallback.classList.add("hidden");
      accountRemovePhotoBtn.classList.remove("hidden");
    } else {
      accountAvatarImg.classList.add("hidden");
      accountAvatarFallback.textContent = (user.username || "?").charAt(0).toUpperCase();
      accountAvatarFallback.classList.remove("hidden");
      accountRemovePhotoBtn.classList.add("hidden");
    }
  }

  async function loadAccount() {
    const user = await api.getMe();
    renderAccount(user);
  }

  accountPhotoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // permite elegir el mismo archivo dos veces seguidas
    if (!file) return;
    accountPhotoError.classList.add("hidden");
    try {
      const resized = await resizePhotoForUpload(file);
      const user = await api.uploadMyPhoto(resized);
      renderAccount(user);
    } catch (err) {
      accountPhotoError.textContent = err.message || "No se pudo subir la foto.";
      accountPhotoError.classList.remove("hidden");
    }
  });

  accountRemovePhotoBtn.addEventListener("click", async () => {
    if (!confirm("¿Quitar tu foto de perfil?")) return;
    accountPhotoError.classList.add("hidden");
    try {
      await api.deleteMyPhoto();
      const user = await api.getMe();
      renderAccount(user);
    } catch (err) {
      accountPhotoError.textContent = err.message || "No se pudo quitar la foto.";
      accountPhotoError.classList.remove("hidden");
    }
  });

  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  function formatMonth(yyyyMm) {
    const [year, month] = yyyyMm.split("-");
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  }

  // --- Vehiculos del usuario ---------------------------------------------------

  // La silueta que se muestra mientras un vehiculo no tiene foto propia
  // subida sale de carSvg (ver js/car-art.js, compartido con el showroom).

  /**
   * Achica y comprime la foto elegida ANTES de subirla: un servidor sin
   * Pillow no puede redimensionar en el backend, y una foto de celular sin
   * tocar pesa varios MB. Con un <canvas> de 800px de lado mayor en JPEG
   * calidad 0.82, en la practica queda en unos cientos de KB -- rapido de
   * subir y de mostrar, y el limite duro del servidor (config.py,
   * MAX_VEHICLE_PHOTO_BYTES) queda como red de contencion, no como el
   * camino normal.
   */
  async function resizePhotoForUpload(file) {
    const MAX_DIM = 800;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
        "image/jpeg",
        0.82
      );
    });
  }

  // URLs blob: creadas para mostrar fotos de vehiculo (ver mas abajo). El
  // navegador no las libera solo; sin revocarlas a mano se van acumulando en
  // memoria cada vez que loadVehicles() se vuelve a llamar (que es en cada
  // alta, baja o cambio de foto).
  let _photoObjectUrls = [];

  async function loadVehicles() {
    const grid = document.getElementById("vehicle-grid");
    const empty = document.getElementById("vehicles-empty");
    const vehicles = await api.listVehicles();

    for (const url of _photoObjectUrls) URL.revokeObjectURL(url);
    _photoObjectUrls = [];

    grid.replaceChildren();
    empty.classList.toggle("hidden", vehicles.length > 0);

    for (const v of vehicles) {
      const autonomiaKm = v.consumption_kwh_per_km ? v.battery_capacity_kwh / v.consumption_kwh_per_km : null;

      const card = document.createElement("article");
      card.className = "vehicle-card";
      card.innerHTML = `
        <div class="vehicle-art-wrap">
          <img class="vehicle-photo hidden" alt="" />
          <div class="vehicle-art-svg">${carSvg(v.name)}</div>
          <label class="vehicle-photo-edit" title="${v.has_photo ? "Cambiar la foto de este auto" : "Agregar una foto de este auto"}">
            <input type="file" accept="image/*" class="vehicle-photo-input" hidden />
            <span aria-hidden="true">${v.has_photo ? "&#9998;" : "&#128247;"}</span>
          </label>
        </div>
        <div class="vehicle-body">
          <h3 class="vehicle-name"></h3>
          <dl class="vehicle-specs">
            <div><dt>Bateria</dt><dd class="mono-num">${v.battery_capacity_kwh} kWh</dd></div>
            <div><dt>Consumo</dt><dd class="mono-num">${v.consumption_kwh_per_km} kWh/km</dd></div>
            <div><dt>Carga</dt><dd class="mono-num">${v.charging_power_kw} kW</dd></div>
            <div><dt>Autonomia</dt><dd class="mono-num">${autonomiaKm ? autonomiaKm.toFixed(0) + " km" : "-"}</dd></div>
          </dl>
        </div>
        <div class="vehicle-card-actions">
          <button type="button" class="ghost small vehicle-remove-photo ${v.has_photo ? "" : "hidden"}">Quitar foto</button>
          <button type="button" class="ghost small vehicle-delete" title="Eliminar vehiculo">Eliminar</button>
        </div>`;

      // El nombre lo pone el usuario: va por textContent, nunca dentro del
      // innerHTML de arriba, para que un nombre con HTML adentro se muestre
      // como texto en vez de ejecutarse.
      card.querySelector(".vehicle-name").textContent = v.name;

      if (v.has_photo) {
        const img = card.querySelector(".vehicle-photo");
        api.vehiclePhotoUrl(v.id).then((url) => {
          if (!url) return;
          _photoObjectUrls.push(url);
          img.src = url;
          img.classList.remove("hidden");
          card.querySelector(".vehicle-art-svg").classList.add("hidden");
        });
      }

      card.querySelector(".vehicle-photo-input").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        e.target.value = ""; // permite elegir el mismo archivo dos veces seguidas
        if (!file) return;
        try {
          const resized = await resizePhotoForUpload(file);
          await api.uploadVehiclePhoto(v.id, resized);
          await loadVehicles();
        } catch (err) {
          alert(err.message || "No se pudo subir la foto.");
        }
      });

      card.querySelector(".vehicle-remove-photo").addEventListener("click", async () => {
        if (!confirm(`¿Quitar la foto de «${v.name}»?`)) return;
        try {
          await api.deleteVehiclePhoto(v.id);
          await loadVehicles();
        } catch (err) {
          alert(err.message || "No se pudo quitar la foto.");
        }
      });

      card.querySelector(".vehicle-delete").addEventListener("click", async () => {
        if (!confirm(`¿Eliminar «${v.name}»? Los viajes que ya hiciste con el se mantienen en el historial.`)) return;
        try {
          await api.deleteVehicle(v.id);
          await loadVehicles();
        } catch (err) {
          alert(err.message || "No se pudo eliminar el vehiculo.");
        }
      });

      grid.appendChild(card);
    }
  }

  // --- Alta de vehiculo desde el perfil ----------------------------------------

  const addForm = document.getElementById("add-vehicle-form");
  const addError = document.getElementById("add-vehicle-error");

  document.getElementById("toggle-add-vehicle").addEventListener("click", () => {
    addForm.classList.toggle("hidden");
    addError.classList.add("hidden");
    if (addForm.classList.contains("hidden")) {
      resetPhotoId();
    } else {
      document.getElementById("p-name").focus();
    }
  });

  // --- Identificar vehiculo por foto (misma IA que la busqueda por nombre) --
  //
  // El navegador ya la redimensiona con resizePhotoForUpload antes de
  // mandarla (mismo motivo que subir la foto de un vehiculo existente): unos
  // cientos de KB en vez de los varios MB que saca una camara de celular.
  // Si identifica el auto, esa MISMA foto queda guardada como pendiente y se
  // sube como foto del vehiculo recien creado al enviar el formulario --
  // igual que en la app movil (ver identifyPhoto en vehiculos/agregar.tsx).
  let pendingPhotoBlob = null;
  let _photoIdPreviewUrl = null;
  const photoInput = document.getElementById("p-photo-input");
  const photoPreview = document.getElementById("p-photo-preview");
  const photoStatus = document.getElementById("p-photo-id-status");

  function resetPhotoId() {
    pendingPhotoBlob = null;
    if (_photoIdPreviewUrl) URL.revokeObjectURL(_photoIdPreviewUrl);
    _photoIdPreviewUrl = null;
    photoPreview.classList.add("hidden");
    photoStatus.classList.add("hidden", "hint-ok");
    photoInput.value = "";
  }

  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // permite elegir la misma foto dos veces seguidas
    if (!file) return;

    photoStatus.classList.remove("hidden", "hint-ok");
    photoStatus.textContent = "Identificando el vehiculo con IA...";

    try {
      const resized = await resizePhotoForUpload(file);
      const result = await api.lookupVehicleAiPhoto(resized);
      if (!result.existe) {
        photoStatus.textContent = "No pudimos identificar un vehiculo electrico en esa foto. Proba con otro angulo o buscalo por nombre.";
        return;
      }

      pendingPhotoBlob = resized;
      if (_photoIdPreviewUrl) URL.revokeObjectURL(_photoIdPreviewUrl);
      _photoIdPreviewUrl = URL.createObjectURL(resized);
      photoPreview.src = _photoIdPreviewUrl;
      photoPreview.classList.remove("hidden");

      document.getElementById("p-name").value = [result.marca, result.modelo].filter(Boolean).join(" ");
      if (result.bateria_kwh != null) document.getElementById("p-capacity").value = result.bateria_kwh;
      if (result.consumo_kwh_km != null) document.getElementById("p-consumption").value = result.consumo_kwh_km;
      if (result.potencia_carga_kw != null) document.getElementById("p-charging-power").value = result.potencia_carga_kw;

      photoStatus.textContent = `Identificado: ${result.marca} ${result.modelo}. Revisa los datos y guarda.`;
      photoStatus.classList.add("hint-ok");
    } catch (err) {
      photoStatus.textContent = err.message || "No se pudo identificar el vehiculo con esa foto.";
    }
  });

  async function loadModelCatalog() {
    try {
      const models = await api.listEvModels();
      // Mismo criterio que el buscador del mapa: la etiqueta visible es
      // "Marca Modelo", y es la clave con la que se resuelve lo tipeado.
      const porEtiqueta = new Map(models.map((m) => [`${m.marca} ${m.modelo}`, m]));
      const datalist = document.getElementById("p-model-datalist");
      datalist.replaceChildren();
      for (const etiqueta of porEtiqueta.keys()) {
        const opt = document.createElement("option");
        opt.value = etiqueta;
        datalist.appendChild(opt);
      }
      const modelPhoto = document.getElementById("p-model-photo");
      document.getElementById("p-model-search").addEventListener("input", (e) => {
        const elegido = porEtiqueta.get(e.target.value);
        if (!elegido) return; // todavia escribiendo, o no coincide con ningun modelo
        document.getElementById("p-name").value = `${elegido.marca} ${elegido.modelo}`;
        document.getElementById("p-capacity").value = elegido.bateria_kwh;
        document.getElementById("p-consumption").value = elegido.consumo_kwh_km;
        document.getElementById("p-charging-power").value = elegido.potencia_carga_kw;
        // Foto de stock del modelo (precargada en Cloudinary, ver
        // scripts/warm_vehicle_photos.py) -- solo informativa, no es la foto
        // que va a quedar en el vehiculo: esa la sube el dueño por separado
        // (ver vehicle-photo-input mas abajo) o via "Identificar con foto".
        if (elegido.foto_url) {
          modelPhoto.src = elegido.foto_url;
          modelPhoto.classList.remove("hidden");
        } else {
          modelPhoto.classList.add("hidden");
        }
      });
    } catch (e) {
      /* sin catalogo se puede cargar igual a mano */
    }
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    addError.classList.add("hidden");
    try {
      const vehicle = await api.createVehicle({
        name: document.getElementById("p-name").value.trim(),
        battery_capacity_kwh: Number(document.getElementById("p-capacity").value),
        consumption_kwh_per_km: Number(document.getElementById("p-consumption").value),
        charging_power_kw: Number(document.getElementById("p-charging-power").value),
      });
      if (pendingPhotoBlob) {
        // La foto que identifico el auto queda como su foto. Si falla (red,
        // foto invalida) el vehiculo ya quedo creado igual: no bloqueamos el
        // flujo principal por un paso secundario (mismo criterio que la app
        // movil, ver AddVehicleScreen.handleSave).
        try {
          await api.uploadVehiclePhoto(vehicle.id, pendingPhotoBlob);
        } catch {
          /* no bloquea: el vehiculo ya se guardo */
        }
      }
      resetPhotoId();
      addForm.reset();
      addForm.classList.add("hidden");
      await loadVehicles();
    } catch (err) {
      // Aca cae, entre otros, el 409 de nombre repetido: el backend ya manda
      // un mensaje explicando cual es el nombre que choca.
      addError.textContent = err.message || "No se pudo crear el vehiculo.";
      addError.classList.remove("hidden");
    }
  });

  function fmt(value, digits, suffix) {
    if (value === null || value === undefined) return "-";
    return value.toFixed(digits) + (suffix || "");
  }

  async function loadVehicleStats() {
    const stats = await api.getVehicleStats();
    const panel = document.getElementById("vehicle-stats-panel");
    const tbody = document.getElementById("vehicle-stats-tbody");

    // Con un solo vehiculo esta tabla repite lo que ya dice la mensual: cada
    // fila seria el total del mes entero. Solo aporta desde el segundo auto.
    if (stats.length < 2) {
      panel.classList.add("hidden");
      return;
    }

    tbody.replaceChildren();
    for (const v of stats) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="cell-vehicle"></td>
        <td>${v.trip_count}</td>
        <td class="mono-num">${fmt(v.total_distance_km, 1, " km")}</td>
        <td class="mono-num">${fmt(v.total_energy_kwh, 1, " kWh")}</td>
        <td class="mono-num cell-total">${v.total_cost_uyu == null ? "-" : formatUyu(v.total_cost_uyu)}</td>
        <td class="mono-num">${v.cost_uyu_per_km == null ? "-" : formatUyu(v.cost_uyu_per_km) + " /km"}</td>
        <td>${v.total_recharges || 0}</td>`;
      // El nombre lo escribe el usuario: por textContent, nunca por innerHTML.
      tr.querySelector(".cell-vehicle").textContent = v.vehicle_name;
      tbody.appendChild(tr);
    }
    panel.classList.remove("hidden");
  }

  async function loadMonthlyStats() {
    const stats = await api.getMonthlyStats();
    const tbody = document.getElementById("monthly-tbody");
    const empty = document.getElementById("monthly-empty");
    tbody.innerHTML = "";
    if (!stats.length) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    for (const m of stats) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatMonth(m.month)}</td>
        <td>${m.trip_count}</td>
        <td class="mono-num">${fmt(m.total_distance_km, 1, " km")}</td>
        <td class="mono-num">${fmt(m.total_energy_kwh, 1, " kWh")}</td>
        <td class="mono-num cell-total">${m.total_cost_uyu == null ? "-" : formatUyu(m.total_cost_uyu)}</td>
        <td>${m.total_recharges || 0}</td>
        <td class="mono-num">${fmt(m.avg_distance_km, 1, " km")}</td>
        <td class="mono-num">${m.avg_cost_uyu == null ? "-" : formatUyu(m.avg_cost_uyu)}</td>`;
      tbody.appendChild(tr);
    }
  }

  async function loadHistory() {
    const history = await api.getHistory();
    const tbody = document.getElementById("history-tbody");
    const empty = document.getElementById("history-empty");
    tbody.innerHTML = "";
    if (!history.length) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    for (const h of history) {
      const tr = document.createElement("tr");
      const noRoute = h.distance_km === null || h.distance_km === undefined;
      tr.innerHTML = `
        <td>${formatDate(h.created_at)}</td>
        <td class="cell-route">${h.origin_name || h.origin_id} &rarr; ${h.destination_name || h.destination_id}</td>
        <td class="${noRoute ? "cell-danger" : ""}">${noRoute ? "sin ruta" : fmt(h.distance_km, 1, " km")}</td>
        <td>${fmt(h.energy_kwh, 2, " kWh")}</td>
        <td>${h.trip_time_min == null ? "-" : formatDuration(h.trip_time_min)}</td>
        <td>${h.costo_uyu_total == null ? "-" : formatUyu(h.costo_uyu_total)}</td>
        <td class="${h.recharge_count ? "cell-recharge" : ""}">${h.recharge_count || 0}</td>
        <td>${noRoute ? "" : '<button type="button" class="primary small view-trip-btn">Ver</button>'}</td>`;
      if (!noRoute) {
        tr.querySelector(".view-trip-btn").addEventListener("click", () => {
          sessionStorage.setItem("routeev_replay_trip", JSON.stringify(h));
          window.location.href = "/app?replay=1";
        });
      }
      tbody.appendChild(tr);
    }
  }

  Promise.allSettled([
    loadAccount(),
    loadVehicles(),
    loadModelCatalog(),
    loadMonthlyStats(),
    loadVehicleStats(),
    loadHistory(),
  ]);
})();
