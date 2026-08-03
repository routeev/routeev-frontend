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
    if (!addForm.classList.contains("hidden")) document.getElementById("p-name").focus();
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
      document.getElementById("p-model-search").addEventListener("input", (e) => {
        const elegido = porEtiqueta.get(e.target.value);
        if (!elegido) return; // todavia escribiendo, o no coincide con ningun modelo
        document.getElementById("p-name").value = `${elegido.marca} ${elegido.modelo}`;
        document.getElementById("p-capacity").value = elegido.bateria_kwh;
        document.getElementById("p-consumption").value = elegido.consumo_kwh_km;
        document.getElementById("p-charging-power").value = elegido.potencia_carga_kw;
      });
    } catch (e) {
      /* sin catalogo se puede cargar igual a mano */
    }
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    addError.classList.add("hidden");
    try {
      await api.createVehicle({
        name: document.getElementById("p-name").value.trim(),
        battery_capacity_kwh: Number(document.getElementById("p-capacity").value),
        consumption_kwh_per_km: Number(document.getElementById("p-consumption").value),
        charging_power_kw: Number(document.getElementById("p-charging-power").value),
      });
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
    loadVehicles(),
    loadModelCatalog(),
    loadMonthlyStats(),
    loadVehicleStats(),
    loadHistory(),
  ]);
})();
