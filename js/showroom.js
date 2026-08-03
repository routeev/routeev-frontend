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
    // Las de la primera pantalla se piden ya (estan a la vista y no tiene
    // sentido esperar a un evento de scroll que puede no llegar nunca); las
    // de mas abajo, cuando el scroll las acerque. Si esa foto ya se resolvio
    // antes, se reusa esa promesa y no se vuelve a pedir nada.
    if (fotoYa || fotos.has(nombre)) {
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

  function mostrarSimulacion(destino, { resultado, error, desde, hasta, bateria }) {
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

    destino.innerHTML = `
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
