/**
 * Showroom publico de autos electricos.
 *
 * Es la unica pantalla del producto que funciona sin cuenta: alguien que
 * todavia no tiene un auto electrico (o esta por comprarlo) entra, busca el
 * modelo que le interesa, y ve sus numeros reales -- incluido cuanto cuesta
 * en pesos y si con ese auto llega a donde quiere ir en Uruguay.
 *
 * De donde sale cada dato (ver showroom_routes.py en la API)
 * ---------------------------------------------------------
 *   catalogo   GET  /api/showroom/models      880 modelos con sus datos de
 *                                             fabrica. Se baja UNA vez y el
 *                                             buscador filtra en memoria: con
 *                                             880 entradas no hace falta ir al
 *                                             servidor en cada tecla.
 *   ficha      GET  /api/showroom/models/{id} los numeros calculados con las
 *                                             constantes y la curva de carga
 *                                             del propio motor de ruteo.
 *   foto       GET  /api/showroom/imagen      la foto del modelo, encontrada
 *                                             por su nombre.
 *   IA         POST /api/showroom/lookup-ai   para un auto que no esta en el
 *                                             catalogo.
 *   simulacion POST /api/showroom/simulate    A* real sobre el mapa del pais.
 *
 * Ningun numero se recalcula aca: los que dependen de una constante del
 * sistema (el precio del kWh, la curva de carga) vienen ya resueltos del
 * backend, para que la vidriera no pueda contradecir al motor.
 */

(function () {
  // Cuantas tarjetas se muestran por tanda. Dibujar los 880 resultados de
  // "sin filtro" de una sola vez cuelga el navegador por varios segundos.
  const PAGINA = 24;

  // Fotos que se piden a la vez. Cada una que no esta todavia en la cache del
  // servidor termina en una consulta a Wikimedia, que frena a quien le pide
  // en rafaga (ver showroom_images.py). De a dos, el grid se llena rapido sin
  // que parezca un scraper.
  const FOTOS_EN_PARALELO = 2;

  // Cuantas tarjetas piden su foto sin esperar a entrar en pantalla: las de
  // la primera fila y media, que ya se estan viendo.
  const FOTOS_SIN_ESPERAR = 8;

  const els = {
    q: document.getElementById("sr-q"),
    clear: document.getElementById("sr-clear"),
    marca: document.getElementById("sr-marca"),
    orden: document.getElementById("sr-orden"),
    soloDc: document.getElementById("sr-dc"),
    count: document.getElementById("sr-count"),
    total: document.getElementById("sr-total"),
    grid: document.getElementById("sr-grid"),
    empty: document.getElementById("sr-empty"),
    emptySub: document.getElementById("sr-empty-sub"),
    aiBox: document.getElementById("sr-ai-box"),
    aiBtn: document.getElementById("sr-ai-btn"),
    aiQ: document.getElementById("sr-ai-q"),
    aiError: document.getElementById("sr-ai-error"),
    more: document.getElementById("sr-more"),
    ficha: document.getElementById("sr-ficha"),
  };

  const state = {
    modelos: [],
    filtrados: [],
    visibles: PAGINA,
    destinos: null,
    aiHabilitada: false,
    fichaId: null,
  };

  // --- Texto ------------------------------------------------------------

  // "Citroën C4" y "citroen c4" tienen que encontrar lo mismo: se comparan
  // las dos puntas sin acentos y en minuscula.
  function normalizar(texto) {
    return texto
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
  }

  function nombreDe(model) {
    return `${model.marca} ${model.modelo}`;
  }

  function num(valor, decimales) {
    return Number(valor).toLocaleString("es-UY", {
      minimumFractionDigits: decimales || 0,
      maximumFractionDigits: decimales || 0,
    });
  }

  // --- Fotos ------------------------------------------------------------
  //
  // Se piden solo cuando la tarjeta entra en pantalla, de a pocas por vez, y
  // el resultado se recuerda: al filtrar, el grid se redibuja entero y las
  // fotos que ya se resolvieron aparecen sin volver a preguntar.

  const fotos = new Map();
  const pendientes = [];
  let enVuelo = 0;

  function bombear() {
    while (enVuelo < FOTOS_EN_PARALELO && pendientes.length) {
      const { tarea, resolve } = pendientes.shift();
      enVuelo++;
      tarea()
        .catch(() => null)
        .then((valor) => {
          enVuelo--;
          resolve(valor);
          bombear();
        });
    }
  }

  function foto(nombre) {
    if (!fotos.has(nombre)) {
      fotos.set(
        nombre,
        new Promise((resolve) => {
          pendientes.push({ tarea: () => api.showroomImage(nombre), resolve });
          bombear();
        })
      );
    }
    return fotos.get(nombre);
  }

  function mostrarFoto(contenedor, meta) {
    if (!meta || !meta.encontrada) return;
    const img = contenedor.querySelector("img");
    img.addEventListener("load", () => {
      img.classList.remove("hidden");
      contenedor.classList.add("con-foto");
    });
    img.src = apiUrl(meta.url);
  }

  // Una sola instancia para todas las tarjetas: crear un observer por tarjeta
  // multiplica el trabajo que hace el navegador en cada scroll.
  const observer = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        observer.unobserve(entrada.target);
        const contenedor = entrada.target;
        foto(contenedor.dataset.nombre).then((meta) => mostrarFoto(contenedor, meta));
      }
    },
    { rootMargin: "200px" }
  );

  // --- Buscador ---------------------------------------------------------

  const ORDENES = {
    autonomia: (a, b) => b.autonomia_aprox_km - a.autonomia_aprox_km,
    bateria: (a, b) => b.bateria_kwh - a.bateria_kwh,
    carga: (a, b) => b.potencia_carga_kw - a.potencia_carga_kw,
    consumo: (a, b) => a.consumo_kwh_km - b.consumo_kwh_km,
  };

  function filtrar() {
    const consulta = normalizar(els.q.value.trim());
    const tokens = consulta ? consulta.split(/\s+/) : [];
    const marca = els.marca.value;
    const soloDc = els.soloDc.checked;

    let lista = state.modelos.filter((m) => {
      if (marca && m.marca !== marca) return false;
      if (soloDc && m.potencia_carga_kw < 50) return false;
      // Todas las palabras tienen que aparecer, en cualquier orden: asi
      // "leaf nissan" y "nissan leaf" encuentran lo mismo.
      return tokens.every((t) => m._busqueda.includes(t));
    });

    const orden = ORDENES[els.orden.value];
    if (orden) {
      lista.sort(orden);
    } else if (consulta) {
      // Relevancia: primero lo que EMPIEZA con lo que se escribio -- sea por
      // la marca ("nissan") o por el modelo ("leaf") -- y dentro de cada
      // grupo, mayor autonomia primero.
      const arranca = (m) => Number(m._busqueda.startsWith(consulta) || m._modelo.startsWith(consulta));
      lista.sort((a, b) => arranca(b) - arranca(a) || b.autonomia_aprox_km - a.autonomia_aprox_km);
    } else {
      lista.sort((a, b) => b.autonomia_aprox_km - a.autonomia_aprox_km);
    }

    state.filtrados = lista;
    state.visibles = PAGINA;
    pintarGrid();
  }

  function pintarGrid() {
    const lista = state.filtrados.slice(0, state.visibles);

    // Las tarjetas de la tanda anterior se van a descartar: sin esto, el
    // observer sigue vigilando elementos que ya no estan en la pagina.
    observer.disconnect();
    els.grid.replaceChildren();
    lista.forEach((model, i) => els.grid.appendChild(tarjeta(model, i < FOTOS_SIN_ESPERAR)));

    const hay = state.filtrados.length > 0;
    els.empty.classList.toggle("hidden", hay);
    els.more.classList.toggle("hidden", state.visibles >= state.filtrados.length);
    els.count.textContent = hay
      ? `${num(state.filtrados.length)} ${state.filtrados.length === 1 ? "modelo" : "modelos"}`
      : "";

    if (!hay) pintarVacio();
  }

  function pintarVacio() {
    const consulta = els.q.value.trim();
    const conFiltros = els.marca.value || els.soloDc.checked;

    els.emptySub.textContent = conFiltros
      ? "Probá con otro nombre, o sacá los filtros de marca y carga rápida."
      : "Probá con otro nombre.";

    // La busqueda por IA solo tiene sentido con un nombre escrito, y solo si
    // el servidor la tiene configurada (ver AI_LOOKUP_ENABLED en la API).
    const ofrecerIa = state.aiHabilitada && consulta.length >= 2 && !conFiltros;
    els.aiBox.classList.toggle("hidden", !ofrecerIa);
    els.aiError.classList.add("hidden");
    if (ofrecerIa) els.aiQ.textContent = consulta;
  }

  function tarjeta(model, fotoYa) {
    const nombre = nombreDe(model);

    const card = document.createElement("article");
    card.className = "sr-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.innerHTML = `
      <div class="sr-card-art">
        <div class="sr-card-silueta">${carSvg(nombre)}</div>
        <img class="sr-card-foto hidden" alt="" />
      </div>
      <div class="sr-card-body">
        <p class="sr-card-marca"></p>
        <h3 class="sr-card-modelo"></h3>
        <dl class="sr-card-specs">
          <div><dt>Batería</dt><dd class="mono-num">${num(model.bateria_kwh, 1)} kWh</dd></div>
          <div><dt>Autonomía</dt><dd class="mono-num">${num(model.autonomia_aprox_km)} km</dd></div>
          <div><dt>Carga</dt><dd class="mono-num">${num(model.potencia_carga_kw)} kW</dd></div>
        </dl>
      </div>`;

    // La marca y el modelo pueden venir de la IA (no solo del catalogo), asi
    // que van por textContent: si trajeran HTML, se muestra como texto en vez
    // de ejecutarse.
    card.querySelector(".sr-card-marca").textContent = model.marca;
    card.querySelector(".sr-card-modelo").textContent = model.modelo;

    if (model.fuente === "ia") {
      const badge = document.createElement("span");
      badge.className = "sr-badge sr-badge-ia";
      badge.textContent = "IA";
      card.querySelector(".sr-card-art").appendChild(badge);
    }

    const art = card.querySelector(".sr-card-art");
    art.dataset.nombre = nombre;
    if (model.foto_url) {
      // Ya esta precargada en Cloudinary (ver scripts/warm_vehicle_photos.py
      // y GET /api/showroom/models): se muestra directo, sin pedirsela al
      // vuelo a /api/showroom/imagen ni pasar por el observer de scroll.
      mostrarFoto(art, { encontrada: true, url: model.foto_url });
    } else if (fotoYa || fotos.has(nombre)) {
      // Las de la primera pantalla se piden ya (estan a la vista y no tiene
      // sentido esperar a un evento de scroll que puede no llegar nunca); las
      // de mas abajo, cuando el scroll las acerque. Si esa foto ya se
      // resolvio antes, se reusa esa promesa y no se vuelve a pedir nada.
      // Este camino es el respaldo para lo que no se pudo precargar (autos
      // identificados por IA, que no existen hasta que alguien los busca, o
      // modelos que se agregaron al catalogo despues de la ultima precarga).
      foto(nombre).then((meta) => mostrarFoto(art, meta));
    } else {
      observer.observe(art);
    }

    card.addEventListener("click", () => abrirFicha(model.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrirFicha(model.id);
      }
    });
    return card;
  }

  // --- Ficha ------------------------------------------------------------

  async function abrirFicha(modelId) {
    detenerSimulacion(); // la ficha anterior puede tener una animacion corriendo sobre un mapa que esta por desaparecer
    state.fichaId = modelId;
    els.ficha.classList.remove("hidden");
    els.ficha.innerHTML = '<p class="sr-cargando">Cargando ficha…</p>';
    els.ficha.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      pintarFicha(await api.showroomModel(modelId));
    } catch (err) {
      els.ficha.replaceChildren();
      const aviso = document.createElement("p");
      aviso.className = "error-banner";
      aviso.textContent = err.message || "No se pudo cargar la ficha de este modelo.";
      els.ficha.appendChild(aviso);
    }
  }

  function cerrarFicha() {
    detenerSimulacion();
    state.fichaId = null;
    els.ficha.classList.add("hidden");
    els.ficha.replaceChildren();
    history.replaceState(null, "", location.pathname);
  }

  function pintarFicha({ model, metricas }) {
    const nombre = nombreDe(model);
    // Un enlace a ESTE auto, para que una concesionaria pueda mandarlo por
    // WhatsApp en vez de decir "buscalo".
    history.replaceState(null, "", `${location.pathname}?modelo=${encodeURIComponent(model.id)}`);

    els.ficha.innerHTML = `
      <button type="button" class="sr-ficha-cerrar" aria-label="Cerrar la ficha">&times;</button>

      <div class="sr-ficha-foto">
        <div class="sr-card-silueta">${carSvg(nombre)}</div>
        <img class="sr-card-foto hidden" alt="" />
        <p class="sr-credito"></p>
      </div>

      <div class="sr-ficha-datos">
        <p class="eyebrow sr-ficha-marca"></p>
        <h2 class="sr-ficha-modelo"></h2>
        <p class="sr-ficha-nota"></p>

        <dl class="sr-stats">
          <div class="sr-stat">
            <dt>Batería</dt>
            <dd class="mono-num">${num(model.bateria_kwh, 1)}<small> kWh</small></dd>
          </div>
          <div class="sr-stat">
            <dt>Autonomía real</dt>
            <dd class="mono-num">${num(metricas.autonomia_calculada_km)}<small> km</small></dd>
            <p class="sr-stat-sub">Fabricante: ${num(model.autonomia_aprox_km)} km</p>
          </div>
          <div class="sr-stat">
            <dt>Consumo</dt>
            <dd class="mono-num">${num(metricas.consumo_kwh_100km, 1)}<small> kWh/100 km</small></dd>
          </div>
          <div class="sr-stat">
            <dt>Carga máxima</dt>
            <dd class="mono-num">${num(model.potencia_carga_kw)}<small> kW</small></dd>
          </div>
          <div class="sr-stat sr-stat-costo">
            <dt>Costo cada 100 km</dt>
            <dd class="mono-num">${formatUyu(metricas.costo_uyu_100km)}</dd>
            <p class="sr-stat-sub">A $ ${num(metricas.energia_uyu_kwh, 2)} el kWh</p>
          </div>
          <div class="sr-stat sr-stat-costo">
            <dt>Cargar la batería entera</dt>
            <dd class="mono-num">${formatUyu(metricas.costo_carga_completa_uyu)}</dd>
            <p class="sr-stat-sub">${num(model.bateria_kwh, 1)} kWh de punta a punta</p>
          </div>
        </dl>

        <div class="sr-bloque">
          <h3>
            Cargar del ${metricas.carga_desde_pct}% al ${metricas.carga_hasta_pct}%
            <small>+${num(metricas.carga_km_recuperados)} km de autonomía</small>
          </h3>
          <p class="sr-bloque-sub">
            En las potencias que existen de verdad en la red uruguaya, sobre las
            ${num(metricas.estaciones_red)} estaciones de UTE del mapa. La potencia baja sola
            cerca del 80%: por eso el tramo final tarda tanto y conviene seguir viaje.
          </p>
          <table class="sr-carga">
            <thead>
              <tr><th>Estación</th><th>Le entrega</th><th>Tarda</th></tr>
            </thead>
            <tbody>
              ${metricas.carga
                .map(
                  (fila) => `
                <tr>
                  <td class="mono-num">${num(fila.potencia_kw)} kW <small>· ${num(fila.estaciones)} estaciones</small></td>
                  <td class="mono-num ${fila.potencia_efectiva_kw < fila.potencia_kw ? "sr-limitado" : ""}">
                    ${num(fila.potencia_efectiva_kw)} kW
                  </td>
                  <td class="mono-num">${formatDuration(fila.minutos)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <p class="sr-nota-carga hidden">
            Este auto acepta hasta ${num(model.potencia_carga_kw)} kW: en una estación más potente
            carga igual de rápido que en una de ${num(model.potencia_carga_kw)} kW, no más.
          </p>
        </div>

        <div class="sr-bloque sr-sim">
          <h3>¿Llego con este auto?</h3>
          <p class="sr-bloque-sub">
            Se calcula el viaje real sobre el mapa vial del país con este auto, revisando
            la batería tramo a tramo y sumando paradas de carga si hacen falta.
          </p>
          <div class="sr-sim-form">
            <div class="field">
              <label for="sim-origen">Desde</label>
              <select id="sim-origen"></select>
            </div>
            <div class="field">
              <label for="sim-destino">Hasta</label>
              <select id="sim-destino"></select>
            </div>
            <div class="field sr-field-bat">
              <label for="sim-bat">Batería al salir</label>
              <input type="number" id="sim-bat" min="10" max="100" step="5" value="100" />
            </div>
          </div>
          <label class="check-field">
            <input type="checkbox" id="sim-vuelta" />
            <span>Ida y vuelta sin cargar en el destino</span>
          </label>
          <button type="button" class="l-btn-primary" id="sim-btn">Calcular el viaje</button>
          <div id="sim-out" class="sr-sim-out hidden"></div>
        </div>
      </div>`;

    els.ficha.querySelector(".sr-ficha-marca").textContent = model.marca;
    els.ficha.querySelector(".sr-ficha-modelo").textContent = model.modelo;

    const nota = els.ficha.querySelector(".sr-ficha-nota");
    if (model.nota) {
      nota.textContent = model.nota;
      nota.classList.toggle("sr-nota-ia", model.fuente === "ia");
    } else {
      nota.remove();
    }

    // Solo tiene sentido aclararlo si alguna estacion de la red le entrega
    // menos de lo que el auto podria aceptar.
    if (metricas.carga.some((f) => f.potencia_efectiva_kw < f.potencia_kw)) {
      els.ficha.querySelector(".sr-nota-carga").classList.remove("hidden");
    }

    els.ficha.querySelector(".sr-ficha-cerrar").addEventListener("click", cerrarFicha);

    const marco = els.ficha.querySelector(".sr-ficha-foto");
    foto(nombre).then((meta) => {
      mostrarFoto(marco, meta);
      pintarCredito(marco.querySelector(".sr-credito"), meta);
    });

    prepararSimulador(model);
    els.ficha.focus({ preventScroll: true });
  }

  function pintarCredito(destino, meta) {
    if (!meta || !meta.encontrada) {
      destino.textContent = "Sin foto libre de este modelo.";
      return;
    }
    const credito = meta.credito || {};
    // Autor y licencia vienen de Wikimedia: texto ajeno, siempre por
    // textContent y nunca por innerHTML.
    const partes = ["Foto: Wikimedia Commons"];
    if (credito.autor) partes.push(credito.autor);
    if (credito.licencia) partes.push(credito.licencia);
    destino.textContent = partes.join(" · ");

    if (credito.archivo_url) {
      const enlace = document.createElement("a");
      enlace.href = credito.archivo_url;
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";
      enlace.textContent = "ver original";
      destino.append(" · ", enlace);
    }
  }

  // --- Animacion del viaje simulado --------------------------------------
  //
  // El resultado numerico ya dice si el auto llega; esto lo muestra pasando:
  // un auto recorriendo la ruta real sobre el mapa (misma curva de calle que
  // devuelve el motor, ver route_coords en showroom_routes.py), con las
  // paradas de carga marcadas donde de verdad caen. No hay GPS real como en
  // "Iniciar viaje" de la app (ver liveTrip.js) -- aca nadie esta manejando
  // -- asi que se anima con un cronometro: la posicion se interpola sobre la
  // polilinea real en vez de seguir una posicion reportada por el dispositivo.

  const CAR_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 15.4h12.8v2.3a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1-.9-.9v-.6H8.7v.6a.9.9 0 0 1-.9.9H6.5a.9.9 0 0 1-.9-.9v-2.3Z"/><path d="M4.9 10.6 6.4 6.4a1.7 1.7 0 0 1 1.6-1.1h8a1.7 1.7 0 0 1 1.6 1.1l1.5 4.2a2 2 0 0 1 .1.7v3.3a.8.8 0 0 1-.8.8H5.6a.8.8 0 0 1-.8-.8v-3.3a2 2 0 0 1 .1-.7Z"/><circle cx="8.1" cy="12.8" r="1.05" fill="#0a0e13"/><circle cx="15.9" cy="12.8" r="1.05" fill="#0a0e13"/></svg>';
  const BOLT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.4h6.1L10.2 22l8.9-11.6h-6.3L13.2 2Z"/></svg>';

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0088;
    const toRad = (d) => (d * Math.PI) / 180;
    const dphi = toRad(lat2 - lat1);
    const dlambda = toRad(lon2 - lon1);
    const a = Math.sin(dphi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  // Distancia acumulada (km) desde el inicio de `coords` hasta cada punto.
  function acumular(coords) {
    const cum = [0];
    for (let i = 1; i < coords.length; i++) {
      cum.push(cum[i - 1] + haversineKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]));
    }
    return cum;
  }

  // Punto sobre la polilinea a una distancia acumulada dada, interpolando
  // dentro del segmento que la contiene (para que el auto se mueva sobre la
  // curva real y no salte de cruce en cruce).
  function puntoEnKm(coords, cum, km) {
    const total = cum[cum.length - 1];
    const objetivo = Math.max(0, Math.min(total, km));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < objetivo) i++;
    const kmPrev = cum[i - 1];
    const kmNext = cum[i];
    const t = kmNext > kmPrev ? (objetivo - kmPrev) / (kmNext - kmPrev) : 0;
    const [la0, lo0] = coords[i - 1];
    const [la1, lo1] = coords[i];
    return [la0 + (la1 - la0) * t, lo0 + (lo1 - lo0) * t];
  }

  // A que distancia acumulada de la polilinea cae un punto dado (para ubicar
  // una parada de carga -- que llega como lat/lon suelto -- dentro de la
  // acumulada de su tramo): el punto de la ruta mas cercano, su acumulada.
  function cumKmDePunto(coords, cum, lat, lon) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineKm(coords[i][0], coords[i][1], lat, lon);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return cum[bestIdx];
  }

  // Unica instancia de mapa/animacion activa a la vez -- cada simulacion
  // nueva (o cerrar la ficha) tiene que apagar la anterior, si no quedan
  // varios requestAnimationFrame corriendo sobre un mapa que ya no existe.
  const sim = { map: null, raf: null, marker: null };

  function detenerSimulacion() {
    if (sim.raf != null) cancelAnimationFrame(sim.raf);
    sim.raf = null;
    if (sim.map) {
      sim.map.remove();
      sim.map = null;
    }
    sim.marker = null;
  }

  function nodeMarkerIcon(cls, label) {
    return L.divIcon({
      className: "",
      html: `<div class="sr-node-marker ${cls}">${label}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function stationMarkerIcon() {
    return L.divIcon({
      className: "",
      html: `<div class="sr-station-marker">${BOLT_SVG}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  function carMarkerIcon() {
    return L.divIcon({
      className: "",
      html: `<div class="sr-car-marker"><div class="sr-car-pulse"></div><div class="sr-car-dot"></div><div class="sr-car-icon">${CAR_SVG}</div></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }

  // Arma, por tramo (ida y vuelta si corresponde), la polilinea con su
  // acumulada y las paradas de ese tramo ya ubicadas en su km. Cada tramo
  // trae su propia ruta -- ver route_coords en showroom_routes.py -- porque
  // la vuelta no es necesariamente la ida al reves (puede tomar otra calle
  // por el estado de bateria con el que arranca).
  function armarTramos(resultado) {
    return resultado.detalle.tramos.map((t) => {
      const coords = t.route_coords;
      const cum = acumular(coords);
      const paradas = resultado.paradas
        .filter((p) => p.tramo === t.tramo)
        .map((p) => ({ ...p, cumKm: cumKmDePunto(coords, cum, p.lat, p.lon) }))
        .sort((a, b) => a.cumKm - b.cumKm);
      return { nombre: t.tramo, coords, cum, totalKm: cum[cum.length - 1], energiaKwh: t.energia_kwh, paradas };
    });
  }

  // Traduce el viaje completo (uno o dos tramos) a una lista de segmentos de
  // tiempo: manejar hasta la proxima parada/fin de tramo, quedarse quieto
  // cargando, o la pausa en el destino antes de arrancar la vuelta. Cada
  // segmento ya trae cuanto dura en la animacion y como varia la bateria
  // (en kWh) durante el, para no tener que recalcular nada cuadro a cuadro.
  //
  // La duracion de manejar es proporcional a la distancia real (no al tiempo
  // real del viaje: un viaje de 8 horas no puede animarse 8 horas), acotada
  // para que ni una vuelta a la esquina ni un cruce del pais se sientan mal.
  const MS_POR_KM = 26; // ritmo de animacion "manejando"
  const DRIVE_MS_MIN = 3200; // piso: un viaje corto no puede animarse en un parpadeo
  const DRIVE_MS_MAX = 13000; // techo: cruzar el pais tampoco puede tardar un minuto entero
  const CHARGE_MS_MIN = 900;
  const CHARGE_MS_MAX = 2600;
  const TURN_MS = 1100;

  function armarSegmentos(tramosInfo, bateriaInicialKwh) {
    // Primera pasada: la geometria de cada segmento (posicion, bateria) sin
    // asignarle duracion todavia -- eso depende del total de km a manejar
    // de TODO el viaje, que recien se sabe al terminar de recorrer los tramos.
    const segments = [];
    let battKwh = bateriaInicialKwh;
    let kmGlobalPrefix = 0;

    tramosInfo.forEach((tramo, tramoIdx) => {
      const ratePerKm = tramo.totalKm > 0 ? tramo.energiaKwh / tramo.totalKm : 0;
      let kmCursor = 0;

      const empujarTramo = (kmHasta) => {
        if (kmHasta <= kmCursor) return;
        const driveKm = kmHasta - kmCursor;
        const battTo = battKwh - ratePerKm * driveKm;
        segments.push({
          type: "drive",
          tramo,
          kmFrom: kmCursor,
          kmTo: kmHasta,
          driveKm,
          kmGlobalFrom: kmGlobalPrefix + kmCursor,
          kmGlobalTo: kmGlobalPrefix + kmHasta,
          battFrom: battKwh,
          battTo,
        });
        battKwh = battTo;
        kmCursor = kmHasta;
      };

      for (const parada of tramo.paradas) {
        empujarTramo(parada.cumKm);
        const battTo = battKwh + parada.kwh;
        segments.push({
          type: "charge",
          tramo,
          kmGlobal: kmGlobalPrefix + kmCursor,
          battFrom: battKwh,
          battTo,
          parada,
          durationMs: Math.min(CHARGE_MS_MAX, Math.max(CHARGE_MS_MIN, parada.minutos * 35)),
        });
        battKwh = battTo;
      }
      empujarTramo(tramo.totalKm);
      kmGlobalPrefix += tramo.totalKm;

      if (tramoIdx < tramosInfo.length - 1) {
        segments.push({ type: "turn", tramo, kmGlobal: kmGlobalPrefix, battFrom: battKwh, battTo: battKwh, durationMs: TURN_MS });
      }
    });

    // Segunda pasada: un presupuesto de tiempo UNICO para todo lo que es
    // manejar (no por segmento, para que 3 tramos cortos no sumen 3 pisos),
    // repartido entre los segmentos de manejo a prorrata de sus km.
    const totalDriveKm = segments.filter((s) => s.type === "drive").reduce((a, s) => a + s.driveKm, 0);
    const driveBudgetMs = Math.min(DRIVE_MS_MAX, Math.max(DRIVE_MS_MIN, totalDriveKm * MS_POR_KM));
    for (const s of segments) {
      if (s.type === "drive") s.durationMs = totalDriveKm > 0 ? driveBudgetMs * (s.driveKm / totalDriveKm) : 0;
    }

    let acc = 0;
    for (const s of segments) {
      s.startMs = acc;
      acc += s.durationMs;
    }
    return { segments, totalMs: acc, totalKm: kmGlobalPrefix };
  }

  function dibujarMapaSim(mapEl, tramosInfo) {
    const map = L.map(mapEl, { preferCanvas: true, zoomControl: false, scrollWheelZoom: false }).setView([-32.5, -56], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const bounds = [];
    tramosInfo.forEach((tramo) => {
      L.polyline(tramo.coords, {
        color: getComputedStyle(document.documentElement).getPropertyValue(tramo.nombre === "ida" ? "--accent-astar" : "--accent-dijkstra").trim(),
        weight: 4,
        opacity: 0.9,
        dashArray: tramo.nombre === "ida" ? null : "2 10",
        lineCap: "round",
      }).addTo(map);
      bounds.push(...tramo.coords);
      for (const parada of tramo.paradas) {
        L.marker([parada.lat, parada.lon], { icon: stationMarkerIcon(), zIndexOffset: 300 })
          .addTo(map)
          .bindPopup(`<b>${escapeHtmlSim(parada.nombre)}</b><br>+${num(parada.kwh, 1)} kWh &middot; ${formatDuration(parada.minutos)}`);
      }
    });

    const origen = tramosInfo[0].coords[0];
    const destinoFinal = tramosInfo[0].coords[tramosInfo[0].coords.length - 1];
    L.marker(origen, { icon: nodeMarkerIcon("sr-origin", "O"), zIndexOffset: 500 }).addTo(map);
    L.marker(destinoFinal, { icon: nodeMarkerIcon("sr-destination", "D"), zIndexOffset: 500 }).addTo(map);

    map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24] });
    return map;
  }

  function escapeHtmlSim(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.textContent;
  }

  function formatBateriaPct(kwh, capacidadKwh) {
    const pct = Math.max(0, Math.min(100, (kwh / capacidadKwh) * 100));
    return `${pct.toFixed(0)}%`;
  }

  function iniciarSimulacionMapa(contenedor, resultado, model, bateriaInicialPct) {
    detenerSimulacion();

    const mapEl = contenedor.querySelector("#sr-sim-map");
    if (!mapEl) return;

    const tramosInfo = armarTramos(resultado);
    if (tramosInfo.some((t) => t.coords.length < 2)) return; // sin geometria: no hay nada que animar

    const capacidadKwh = model.bateria_kwh;
    const bateriaInicialKwh = (capacidadKwh * bateriaInicialPct) / 100;
    const { segments, totalMs, totalKm } = armarSegmentos(tramosInfo, bateriaInicialKwh);

    sim.map = dibujarMapaSim(mapEl, tramosInfo);
    sim.marker = L.marker(tramosInfo[0].coords[0], { icon: carMarkerIcon(), zIndexOffset: 1000 }).addTo(sim.map);

    const elKm = contenedor.querySelector("#sr-sim-live-km");
    const elBat = contenedor.querySelector("#sr-sim-live-bat");
    const elTime = contenedor.querySelector("#sr-sim-live-time");
    const elFill = contenedor.querySelector("#sr-sim-live-fill");
    const elStatus = contenedor.querySelector("#sr-sim-live-status");
    const btnReplay = contenedor.querySelector("#sr-sim-replay");

    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function puntoDeSegmento(seg, p) {
      const tramo = seg.tramo;
      if (seg.type === "drive") {
        const km = seg.kmFrom + (seg.kmTo - seg.kmFrom) * p;
        return puntoEnKm(tramo.coords, tramo.cum, km);
      }
      if (seg.type === "charge") return [seg.parada.lat, seg.parada.lon];
      return tramo.coords[tramo.coords.length - 1]; // turn: quieto en el destino
    }

    function pintar(seg, p) {
      const [lat, lon] = puntoDeSegmento(seg, p);
      sim.marker.setLatLng([lat, lon]);

      const kmGlobal = seg.type === "drive" ? seg.kmGlobalFrom + (seg.kmGlobalTo - seg.kmGlobalFrom) * p : seg.kmGlobal;
      const battKwh = seg.battFrom + (seg.battTo - seg.battFrom) * p;

      const tiempoTotalMin = resultado.tiempo_total_min || 0;
      const tiempoTranscurridoMin = totalMs > 0 ? (totalMsAnimado(seg, p) / totalMs) * tiempoTotalMin : 0;

      elKm.textContent = `${num(kmGlobal, 1)} / ${num(totalKm, 1)} km`;
      elBat.textContent = formatBateriaPct(battKwh, capacidadKwh);
      elTime.textContent = `${formatDuration(tiempoTranscurridoMin)} / ${formatDuration(tiempoTotalMin)}`;
      elFill.style.width = `${Math.min(100, (kmGlobal / Math.max(0.001, totalKm)) * 100)}%`;
      elFill.classList.toggle("charging", seg.type === "charge");

      if (seg.type === "charge") {
        elStatus.textContent = `Cargando en ${seg.parada.nombre}… (+${num(seg.parada.kwh, 1)} kWh, ${formatDuration(seg.parada.minutos)} reales)`;
        elStatus.classList.add("charging");
        elStatus.classList.remove("done");
      } else if (seg.type === "turn") {
        elStatus.textContent = "Llegó al destino. Iniciando la vuelta…";
        elStatus.classList.remove("charging", "done");
      } else {
        elStatus.textContent = seg.tramo.nombre === "vuelta" ? "Volviendo…" : "En ruta…";
        elStatus.classList.remove("charging", "done");
      }
    }

    function totalMsAnimado(seg, p) {
      return seg.startMs + seg.durationMs * p;
    }

    function terminar() {
      const last = segments[segments.length - 1];
      pintar(last, 1);
      elStatus.textContent = tramosInfo.length > 1 ? "Ida y vuelta completa." : "Llegó a destino.";
      elStatus.classList.remove("charging");
      elStatus.classList.add("done");
      elFill.classList.remove("charging");
      btnReplay.disabled = false;
    }

    function reproducir() {
      // Corta la animacion anterior sin desmontar el mapa (a diferencia de
      // detenerSimulacion, que si lo hace): "repetir" reusa el mismo mapa ya
      // dibujado, solo reinicia el cronometro.
      if (sim.raf != null) cancelAnimationFrame(sim.raf);
      btnReplay.disabled = true;
      sim.marker.setLatLng(tramosInfo[0].coords[0]);

      if (reducedMotion) {
        terminar();
        btnReplay.disabled = false;
        return;
      }

      const t0 = performance.now();
      const tick = (now) => {
        const elapsed = now - t0;
        let seg = segments[segments.length - 1];
        let p = 1;
        for (const s of segments) {
          if (elapsed < s.startMs + s.durationMs) {
            seg = s;
            p = s.durationMs > 0 ? (elapsed - s.startMs) / s.durationMs : 1;
            break;
          }
        }
        pintar(seg, Math.max(0, Math.min(1, p)));

        if (elapsed >= totalMs) {
          terminar();
          sim.raf = null;
          return;
        }
        sim.raf = requestAnimationFrame(tick);
      };
      sim.raf = requestAnimationFrame(tick);
    }

    btnReplay.addEventListener("click", reproducir);
    pintar(segments[0], 0);
    // Arranca sola: es la parte que tiene que impactar apenas se calcula el
    // viaje, no algo que haya que ir a buscar con otro clic.
    reproducir();
  }

  // --- Simulacion de viaje ----------------------------------------------

  async function prepararSimulador(model) {
    const origen = els.ficha.querySelector("#sim-origen");
    const destino = els.ficha.querySelector("#sim-destino");
    const salida = els.ficha.querySelector("#sim-out");
    const boton = els.ficha.querySelector("#sim-btn");

    if (state.destinos === null) {
      try {
        state.destinos = await api.showroomDestinos();
      } catch (e) {
        state.destinos = [];
      }
    }
    if (!state.destinos.length) {
      els.ficha.querySelector(".sr-sim").remove();
      return;
    }

    for (const select of [origen, destino]) {
      select.replaceChildren();
      for (const lugar of state.destinos) {
        const opt = document.createElement("option");
        opt.value = lugar.id;
        opt.textContent = `${lugar.nombre} (${lugar.departamento})`;
        select.appendChild(opt);
      }
    }
    origen.selectedIndex = 0; // Montevideo, primero en la lista
    // Un destino lejos por defecto: el caso interesante es el que obliga a
    // parar a cargar, no el de la vuelta a la esquina.
    destino.selectedIndex = Math.min(state.destinos.length - 1, indiceDe("Punta del Este"));

    boton.addEventListener("click", async () => {
      const bateria = Math.max(10, Math.min(100, Number(els.ficha.querySelector("#sim-bat").value) || 100));
      if (origen.value === destino.value) {
        mostrarSimulacion(salida, { error: "Elegí un destino distinto del origen." });
        return;
      }

      boton.disabled = true;
      boton.textContent = "Calculando…";
      try {
        const res = await api.showroomSimulate({
          origin_id: origen.value,
          destination_id: destino.value,
          model_ids: [model.id],
          bateria_inicial_pct: bateria,
          ida_y_vuelta: els.ficha.querySelector("#sim-vuelta").checked,
        });
        mostrarSimulacion(salida, {
          resultado: res.resultados[0],
          desde: origen.options[origen.selectedIndex].textContent,
          hasta: destino.options[destino.selectedIndex].textContent,
          bateria,
          model,
        });
      } catch (err) {
        mostrarSimulacion(salida, { error: err.message || "No se pudo calcular el viaje." });
      } finally {
        boton.disabled = false;
        boton.textContent = "Calcular el viaje";
      }
    });
  }

  function indiceDe(nombre) {
    const i = state.destinos.findIndex((d) => d.nombre === nombre);
    return i === -1 ? state.destinos.length - 1 : i;
  }

  function mostrarSimulacion(destino, { resultado, error, desde, hasta, bateria, model }) {
    detenerSimulacion(); // cualquier animacion de un calculo anterior queda sobre un mapa a punto de borrarse
    destino.classList.remove("hidden");
    destino.replaceChildren();

    if (error) {
      destino.innerHTML = '<p class="error-banner"></p>';
      destino.querySelector("p").textContent = error;
      return;
    }

    if (!resultado.llega) {
      destino.innerHTML = `
        <p class="sr-sim-veredicto sr-no">No llega</p>
        <p class="sr-sim-detalle">
          Saliendo con ${bateria}% de batería no hay ningún camino que este auto pueda hacer hasta ahí,
          ni parando a cargar en las estaciones que hay en el trayecto.
        </p>`;
      return;
    }

    // Mismo desglose que ve alguien con cuenta al calcular una ruta en el
    // mapa: distancia, tiempo abierto en conduccion/trafico/carga, energia,
    // peajes reales, y cada parada con su direccion.
    const paradas = resultado.paradas || [];
    const d = resultado.detalle;
    // route_coords viene por tramo (ver showroom_routes.py); sin geometria
    // (caso raro, pero mejor no asumir) se muestran igual los numeros, solo
    // sin el mapa animado.
    const tieneMapa = d.tramos.every((t) => Array.isArray(t.route_coords) && t.route_coords.length > 1);

    destino.innerHTML = `
      ${
        tieneMapa
          ? `<div class="sr-sim-anim">
               <div class="sr-sim-map-wrap">
                 <div class="sr-sim-map" id="sr-sim-map"></div>
                 <button type="button" class="l-btn-ghost sr-sim-replay" id="sr-sim-replay">↻ Repetir animación</button>
               </div>
               <div class="sr-sim-live">
                 <div class="sr-sim-live-row">
                   <div class="sr-sim-live-item"><span>Recorrido</span><b id="sr-sim-live-km"></b></div>
                   <div class="sr-sim-live-item"><span>Batería</span><b id="sr-sim-live-bat"></b></div>
                   <div class="sr-sim-live-item"><span>Tiempo de viaje</span><b id="sr-sim-live-time"></b></div>
                 </div>
                 <div class="sr-sim-progress-track"><div class="sr-sim-progress-fill" id="sr-sim-live-fill"></div></div>
                 <div class="sr-sim-status" id="sr-sim-live-status">Arrancando…</div>
               </div>
             </div>`
          : ""
      }
      <p class="sr-sim-veredicto sr-si">Llega</p>
      <p class="sr-sim-detalle"></p>

      <dl class="sr-sim-cifras">
        <div><dt>Distancia</dt><dd class="mono-num">${num(d.distancia_km, 1)} km</dd></div>
        <div><dt>Tiempo total</dt><dd class="mono-num">${formatDuration(resultado.tiempo_total_min)}</dd></div>
        <div><dt>Batería al llegar</dt><dd class="mono-num sr-bat">${num(resultado.bateria_llegada_pct, 1)}%</dd></div>
        <div><dt>Costo del viaje</dt><dd class="mono-num sr-costo">${formatUyu(resultado.costo_uyu)}</dd></div>
      </dl>

      <div class="sr-sim-desglose">
        <div class="sr-desglose-col">
          <h5>El tiempo</h5>
          <ul>
            <li><span>Manejando</span><span class="mono-num">${formatDuration(d.conduccion_min)}</span></li>
            <li><span>Demoras por tráfico</span><span class="mono-num">${formatDuration(d.trafico_min)}</span></li>
            <li><span>Enchufado cargando</span><span class="mono-num">${formatDuration(d.recarga_min)}</span></li>
          </ul>
        </div>
        <div class="sr-desglose-col">
          <h5>La plata</h5>
          <ul>
            <li><span>Energía (${num(d.energia_kwh, 1)} kWh)</span><span class="mono-num">${formatUyu(d.costo_uyu_energia)}</span></li>
            <li><span>Peajes${d.peajes ? ` (${d.peajes})` : ""}</span><span class="mono-num">${formatUyu(d.peaje_uyu)}</span></li>
            <li class="sr-desglose-total"><span>Total</span><span class="mono-num">${formatUyu(resultado.costo_uyu)}</span></li>
          </ul>
        </div>
      </div>

      ${
        d.tramos.length > 1
          ? `<ul class="sr-sim-tramos">${d.tramos
              .map(
                (t) => `<li>
                  <span class="sr-tramo-nombre">${t.tramo === "ida" ? "Ida" : "Vuelta"}</span>
                  <span class="mono-num">${num(t.distancia_km, 1)} km</span>
                  <span class="mono-num">${formatDuration(t.conduccion_min + t.trafico_min + t.recarga_min)}</span>
                  <span class="mono-num">${formatUyu(t.costo_uyu_total)}</span>
                </li>`
              )
              .join("")}</ul>`
          : ""
      }

      ${
        paradas.length
          ? `<h5 class="sr-paradas-titulo">Dónde para a cargar</h5>
             <ol class="sr-sim-paradas">${paradas
               .map(
                 () => `<li>
                   <div class="sr-parada-head">
                     <span class="sr-parada-nombre"></span>
                     <span class="sr-parada-tramo"></span>
                   </div>
                   <p class="sr-parada-dir"></p>
                   <p class="sr-parada-datos mono-num"></p>
                 </li>`
               )
               .join("")}</ol>`
          : '<p class="sr-sin-paradas">Llega de una, sin parar a cargar en el camino.</p>'
      }`;

    destino.querySelector(".sr-sim-detalle").textContent =
      `${desde} → ${hasta}, saliendo con ${bateria}% de batería` +
      (d.tramos.length > 1 ? ", ida y vuelta." : ".");

    // Todo lo que viene del grafo (nombre y direccion de la estacion) se
    // escribe por textContent, nunca dentro del innerHTML de arriba.
    const filas = destino.querySelectorAll(".sr-sim-paradas li");
    paradas.forEach((parada, i) => {
      const fila = filas[i];
      fila.querySelector(".sr-parada-nombre").textContent = parada.nombre;
      fila.querySelector(".sr-parada-tramo").textContent = d.tramos.length > 1 ? parada.tramo : "";
      fila.querySelector(".sr-parada-dir").textContent = [parada.direccion, parada.operador]
        .filter(Boolean)
        .join(" · ");

      const datos = [`${formatDuration(parada.minutos)} enchufado`, `+${num(parada.kwh, 1)} kWh`];
      if (parada.potencia_efectiva_kw) {
        datos.push(
          parada.potencia_efectiva_kw < parada.potencia_kw
            ? `${num(parada.potencia_efectiva_kw)} kW (la estación da ${num(parada.potencia_kw)})`
            : `${num(parada.potencia_kw)} kW`
        );
      }
      if (parada.conector) datos.push(parada.conector);
      fila.querySelector(".sr-parada-datos").textContent = datos.join(" · ");
    });

    if (tieneMapa) iniciarSimulacionMapa(destino, resultado, model, bateria);
  }

  // --- Busqueda por IA --------------------------------------------------

  async function buscarConIa() {
    const consulta = els.q.value.trim();
    if (!consulta) return;

    els.aiBtn.disabled = true;
    els.aiBtn.textContent = "Buscando…";
    els.aiError.classList.add("hidden");
    try {
      const ficha = await api.showroomLookupAi(consulta);
      // Se suma a la lista en memoria: queda buscable como uno mas por lo que
      // dure la visita, y su tarjeta muestra de donde salio.
      agregarModelo(ficha.model);
      filtrar();
      pintarFicha(ficha);
    } catch (err) {
      els.aiError.textContent = err.message || "No se pudo consultar la IA.";
      els.aiError.classList.remove("hidden");
    } finally {
      els.aiBtn.disabled = false;
      els.aiBtn.textContent = "Identificarlo con IA";
    }
  }

  function indexar(model) {
    model._busqueda = normalizar(nombreDe(model));
    model._modelo = normalizar(model.modelo);
  }

  function agregarModelo(model) {
    if (state.modelos.some((m) => m.id === model.id)) return;
    indexar(model);
    state.modelos.push(model);
  }

  // --- Arranque ---------------------------------------------------------

  function pintarMarcas() {
    const marcas = [...new Set(state.modelos.map((m) => m.marca))].sort((a, b) => a.localeCompare(b, "es"));
    for (const marca of marcas) {
      const opt = document.createElement("option");
      opt.value = marca;
      opt.textContent = marca;
      els.marca.appendChild(opt);
    }
  }

  function conectarControles() {
    let debounce;
    els.q.addEventListener("input", () => {
      els.clear.classList.toggle("hidden", !els.q.value);
      // El filtrado es en memoria, pero redibujar el grid en cada tecla se
      // nota al escribir rapido.
      clearTimeout(debounce);
      debounce = setTimeout(filtrar, 120);
    });

    els.clear.addEventListener("click", () => {
      els.q.value = "";
      els.clear.classList.add("hidden");
      els.q.focus();
      filtrar();
    });

    els.marca.addEventListener("change", filtrar);
    els.orden.addEventListener("change", filtrar);
    els.soloDc.addEventListener("change", filtrar);
    els.aiBtn.addEventListener("click", buscarConIa);

    els.more.addEventListener("click", () => {
      state.visibles += PAGINA;
      pintarGrid();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.fichaId) cerrarFicha();
    });
  }

  async function init() {
    conectarControles();

    // Si el servidor no tiene IA configurada, el boton de "buscar con IA"
    // directamente no existe (mismo criterio que el resto de la app).
    api
      .authConfig()
      .then((cfg) => {
        state.aiHabilitada = Boolean(cfg.ai_vehicle_lookup_enabled);
      })
      .catch(() => {});

    try {
      const catalogo = await api.showroomModels();
      state.modelos = catalogo.models;
      for (const m of state.modelos) indexar(m);
      els.total.textContent = num(state.modelos.length);
      pintarMarcas();
      filtrar();
    } catch (err) {
      els.grid.replaceChildren();
      const aviso = document.createElement("p");
      aviso.className = "error-banner";
      aviso.textContent = `No se pudo cargar el catálogo: ${err.message}`;
      els.grid.appendChild(aviso);
      return;
    }

    // Enlace directo a un auto (?modelo=...), para poder compartir la ficha.
    const pedido = new URLSearchParams(location.search).get("modelo");
    if (pedido) abrirFicha(pedido);
  }

  init();
})();
