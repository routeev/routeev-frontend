import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";
import { useMapStore, type PickMode } from "../mapStore";
import { claimPickRole, DOUBLE_CLICK_GUARD_MS } from "../pickSequence";
import { fromCoords } from "../routePoint";
import { snapInBackground } from "../snapPoint";

/**
 * Fija origen/destino al tocar el mapa, portado de js/map/mapCore.js.
 *
 * El punto se fija con la COORDENADA EXACTA del toque, sin red de por medio:
 * el pin cae bajo el dedo y `POST /api/route/plan` calcula desde ahí. Antes
 * esto llamaba a `/api/graph/nearest` y esperaba entre 0,3 y 1 s para
 * "saltar" al cruce más cercano del grafo, que en ruta abierta puede estar a
 * kilómetros — de ahí venía toda la UX de "quedó lejos de donde tocaste", que
 * ya no hace falta porque el punto no se mueve.
 *
 * El nodo del grafo se sigue buscando, pero en segundo plano y sin bloquear
 * nada (ver snapPoint.ts): solo lo necesita el historial.
 *
 * El guard contra el doble-click-para-zoom de Leaflet vive en pickSequence.ts
 * (DOUBLE_CLICK_GUARD_MS / claimPickRole) junto con la explicación del bug que
 * arreglan: acá lo importante es que cada toque tiene SU PROPIO timeout y se
 * queda con su rol en el momento del toque. La versión anterior guardaba un
 * único timeout y lo cancelaba en cada click nuevo, así que dos toques
 * deliberados a menos de 250 ms fijaban un solo punto -- y siempre el origen.
 */
interface ClickToPickProps {
  // msg null limpia cualquier aviso previo. El toque ya no puede fallar (no
  // hay red en el camino), así que hoy solo se usa para limpiar.
  onError: (msg: string | null, severity?: "error" | "warn") => void;
}

export function ClickToPick({ onError }: ClickToPickProps) {
  // Timeouts agendados y todavía sin correr. Un array, no un solo id: ver el
  // comentario del componente.
  // El rol viaja junto al timeout para poder devolver SOLO los roles de los
  // toques que se cancelan, y no la lista entera (ver dblclick).
  const pendingRef = useRef<{ timeoutId: number; role: PickMode }[]>([]);
  // Roles ya repartidos entre toques que todavía no llegaron al store: hoy eso
  // dura exactamente los DOUBLE_CLICK_GUARD_MS del timeout, porque fijar el
  // punto es síncrono. Sigue existiendo aparte de pendingRef porque
  // claimPickRole lee esta lista para repartir roles entre toques de una
  // ráfaga, no para saber cuántos timeouts hay.
  const claimedRef = useRef<PickMode[]>([]);

  useEffect(() => {
    // Desmontar el mapa con toques agendados dejaría timeouts escribiendo en
    // un store que la pantalla ya no está mirando. La lista se lee al
    // desmontar a propósito (es justo la que quedó viva en ese momento), no
    // una copia congelada al montar.
    const pending = pendingRef.current;
    return () => {
      for (const { timeoutId } of pending) window.clearTimeout(timeoutId);
      pending.length = 0;
    };
  }, []);

  // "Cancelar" tiene que cancelar de verdad. stopPicking() vive en el store y
  // no llega hasta estos refs, así que un toque ya agendado aterrizaba igual
  // DESPUÉS de cancelar: se fijaba el punto que la persona acababa de
  // descartar.
  //
  // Que picking pase a null con toques pendientes solo puede ser una
  // cancelación de la persona: applyPick recién apaga el cartel cuando no
  // queda ningún toque agendado.
  const picking = useMapStore((s) => s.picking);
  useEffect(() => {
    if (picking !== null || pendingRef.current.length === 0) return;
    for (const { timeoutId } of pendingRef.current) window.clearTimeout(timeoutId);
    pendingRef.current.length = 0;
    claimedRef.current.length = 0;
    // Ya no hace falta desautorizar nada en vuelo: fijar el punto es
    // síncrono. El snap de fondo que pueda quedar dando vueltas se descarta
    // solo, porque annotateSnap compara el pointKey del punto vigente.
  }, [picking]);

  function releaseClaim(role: PickMode) {
    const i = claimedRef.current.indexOf(role);
    if (i !== -1) claimedRef.current.splice(i, 1);
  }

  function applyPick(role: PickMode, lat: number, lon: number) {
    const store = useMapStore.getState();
    // Síncrono y exacto: el punto es la coordenada del toque.
    const p = fromCoords(lat, lon);
    if (role === "origin") {
      store.setOrigin(p);
      store.setPickMode("destination");
    } else {
      store.setDestination(p);
    }
    onError(null);
    releaseClaim(role);
    // El punto quedó fijado: el mapa dejó de estar "esperando que toques".
    // Solo si no quedan más toques agendados, para no apagar el cartel en
    // medio de una ráfaga -- y para que el efecto de arriba pueda distinguir
    // esto de una cancelación de la persona.
    if (claimedRef.current.length === 0 && pendingRef.current.length === 0) {
      store.stopPicking();
    }
    // Sin await, y después de fijar: buscar el nodo del grafo es solo para el
    // historial y no puede demorar el pin ni el cálculo.
    void snapInBackground(role, lat, lon);
  }

  useMapEvents({
    click(e) {
      // Con un viaje ya calculado, RouteInputPanel (donde viven los botones de
      // "marcar tocando el mapa") ni se muestra -- lo reemplazó TripDashboard.
      // Sin este corte, un toque cualquiera en el mapa (por ejemplo para mirar
      // el recorrido de cerca) igual fijaba un origen/destino nuevo y con eso
      // borraba el resultado (setOrigin/setDestination limpian lastResult al
      // cambiar el punto) -- cancelaba el viaje sin que la persona lo pidiera.
      // Pedido explícito: mientras haya resultado, solo "Cancelar viaje" (en
      // TripDashboard) puede volver a abrir el mapa para elegir de nuevo.
      if (useMapStore.getState().lastResult != null) return;
      // lat/lng se copian ACA: el objeto de evento de Leaflet se reusa entre
      // eventos, y para cuando corre el timeout puede ya no describir este
      // toque.
      const { lat, lng } = e.latlng;
      const { pickMode, picking: pidioRol } = useMapStore.getState();
      const role = claimPickRole(pickMode, claimedRef.current, pidioRol);
      claimedRef.current.push(role);
      const timeoutId = window.setTimeout(() => {
        // splice y no `= filter(...)`: la lista se muta en el lugar, nunca se
        // reemplaza, porque el cleanup de arriba se quedó con ESTE array.
        const i = pendingRef.current.findIndex((p) => p.timeoutId === timeoutId);
        if (i !== -1) pendingRef.current.splice(i, 1);
        applyPick(role, lat, lng);
      }, DOUBLE_CLICK_GUARD_MS);
      pendingRef.current.push({ timeoutId, role });
    },
    dblclick() {
      // Los dos clicks del doble click siguen agendados (el dblclick llega a
      // pocos ms del segundo): se cancelan los dos y se devuelven SUS roles.
      //
      // Se devuelven solo los roles de los timeouts que se cancelan acá y no
      // se vacía claimedRef entero: aunque hoy applyPick libera el rol en el
      // mismo callback síncrono en que fija el punto (así que las dos listas
      // van a la par), devolver un rol que no se canceló acá sería devolver
      // uno que otro toque de la ráfaga ya tiene asignado.
      for (const { timeoutId, role } of pendingRef.current) {
        window.clearTimeout(timeoutId);
        releaseClaim(role);
      }
      pendingRef.current.length = 0;
    },
  });

  return null;
}
