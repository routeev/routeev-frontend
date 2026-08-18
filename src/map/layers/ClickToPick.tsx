import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";
import { getNearestNode } from "../../api/graph";
import { useTranslation } from "../../i18n/LanguageProvider";
import { haversineKm } from "../../shared/geo";
import { useMapStore, type PickMode } from "../mapStore";
import { claimPickRole, DOUBLE_CLICK_GUARD_MS } from "../pickSequence";

// El backend nunca rechaza un click -- /api/graph/nearest siempre devuelve
// la interseccion mas cercana del grafo, sin tope de distancia (ver
// nearest_node en routeev-api/app/graph.py). En rutas interdepartamentales
// esas intersecciones estan muy espaciadas, asi que un click "impreciso"
// puede resolver a un punto bastante lejos de donde se tocó. Mismo umbral
// que ya usa /api/graph/geocode (distance_to_node_km > 2) para el aviso
// equivalente al buscar una dirección escrita.
const IMPRECISE_CLICK_KM = 2;

/**
 * Fija origen/destino al tocar el mapa, portado de js/map/mapCore.js.
 *
 * El guard contra el doble-click-para-zoom de Leaflet vive en pickSequence.ts
 * (DOUBLE_CLICK_GUARD_MS / claimPickRole) junto con la explicación del bug que
 * arreglan: acá lo importante es que cada toque tiene SU PROPIO timeout y se
 * queda con su rol en el momento del toque. La versión anterior guardaba un
 * único timeout y lo cancelaba en cada click nuevo, así que dos toques
 * deliberados a menos de 250 ms fijaban un solo punto -- y siempre el origen.
 */
interface ClickToPickProps {
  // severity "warn": el click se resolvió igual, pero lejos del punto real
  // (ver IMPRECISE_CLICK_KM). severity "error": no se pudo resolver nada.
  // msg null limpia cualquier aviso previo (p.ej. tras un click preciso).
  onError: (msg: string | null, severity?: "error" | "warn") => void;
}

export function ClickToPick({ onError }: ClickToPickProps) {
  const { t } = useTranslation();
  // Timeouts agendados y todavía sin correr. Un array, no un solo id: ver el
  // comentario del componente.
  // El rol viaja junto al timeout para poder devolver SOLO los roles de los
  // toques que se cancelan, y no la lista entera (ver dblclick).
  const pendingRef = useRef<{ timeoutId: number; role: PickMode }[]>([]);
  // Roles ya repartidos entre toques que todavía no llegaron al store (están
  // esperando el timeout o la respuesta de /api/graph/nearest).
  const claimedRef = useRef<PickMode[]>([]);
  // Contador de toques y, por rol, cuál es el toque vigente. Es lo que permite
  // descartar la respuesta de un toque viejo que volvió tarde (ver resolvePick).
  const seqRef = useRef(0);
  const vigenteRef = useRef<Partial<Record<PickMode, number>>>({});

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
  // no llega hasta estos refs, así que un toque ya agendado (o resolviéndose
  // contra la API, entre 0,3 y 1 s) aterrizaba igual DESPUÉS de cancelar: se
  // fijaba el punto que la persona acababa de descartar, y encima podía
  // aparecer la tarjeta de "quedó lejos" por un pick cancelado.
  //
  // Que picking pase a null con toques pendientes solo puede ser una
  // cancelación de la persona: resolvePick recién apaga el cartel cuando no
  // queda ninguno (ver el finally).
  const picking = useMapStore((s) => s.picking);
  useEffect(() => {
    if (picking !== null || pendingRef.current.length === 0) return;
    for (const { timeoutId } of pendingRef.current) window.clearTimeout(timeoutId);
    pendingRef.current.length = 0;
    claimedRef.current.length = 0;
    // Los que ya están en vuelo contra la API no se pueden abortar, pero sí
    // desautorizar: al volver, el chequeo de secuencia los descarta.
    seqRef.current += 1;
    vigenteRef.current = {};
  }, [picking]);

  function releaseClaim(role: PickMode) {
    const i = claimedRef.current.indexOf(role);
    if (i !== -1) claimedRef.current.splice(i, 1);
  }

  async function resolvePick(role: PickMode, lat: number, lon: number, seq: number) {
    try {
      const node = await getNearestNode(lat, lon);
      // Las respuestas de /api/graph/nearest no vuelven necesariamente en el
      // orden en que se pidieron. Sin este chequeo, tocar un punto equivocado
      // y corregirlo enseguida podía terminar con el punto EQUIVOCADO fijado,
      // porque su respuesta llegó segunda. Solo escribe el toque más nuevo de
      // cada rol; los viejos se descartan en silencio, que es exactamente lo
      // que la persona pidió al volver a tocar.
      if (vigenteRef.current[role] !== seq) return;
      const store = useMapStore.getState();
      if (role === "origin") {
        store.setOrigin(node);
        store.setPickMode("destination");
      } else {
        store.setDestination(node);
      }
      const distanceKm = haversineKm(lat, lon, node.lat, node.lon);
      if (distanceKm > IMPRECISE_CLICK_KM) {
        // Ya no un banner de texto y listo: se guarda el punto tocado junto al
        // nodo elegido para poder dibujar la distancia en el mapa y ofrecer
        // aceptar o volver a marcar (ver ImprecisePickLink y RouteInputPanel).
        // El backend snapea a NODOS del grafo (cruces y estaciones), nunca al
        // punto más cercano sobre la calle, así que a escala de país esto pasa
        // seguido en ruta abierta -- y antes la persona quedaba con un aviso y
        // ninguna salida.
        store.setImprecisePick({ role, node, clickLat: lat, clickLon: lon, distanceKm });
      }
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : t.map.layers.clickToPick.resolveError, "error");
    } finally {
      releaseClaim(role);
      // El punto quedó fijado (o falló): en cualquiera de los dos casos el
      // mapa dejó de estar "esperando que toques". Solo si no quedan más
      // toques en camino NI agendados, para no apagar el cartel en medio de
      // una ráfaga -- y para que el efecto de arriba pueda distinguir esto de
      // una cancelación de la persona.
      if (claimedRef.current.length === 0 && pendingRef.current.length === 0) {
        useMapStore.getState().stopPicking();
      }
    }
  }

  useMapEvents({
    click(e) {
      // lat/lng se copian ACA: el objeto de evento de Leaflet se reusa entre
      // eventos, y para cuando corre el timeout puede ya no describir este
      // toque.
      const { lat, lng } = e.latlng;
      const { pickMode, picking: pidioRol } = useMapStore.getState();
      const role = claimPickRole(pickMode, claimedRef.current, pidioRol);
      claimedRef.current.push(role);
      const seq = ++seqRef.current;
      vigenteRef.current[role] = seq;
      const timeoutId = window.setTimeout(() => {
        // splice y no `= filter(...)`: la lista se muta en el lugar, nunca se
        // reemplaza, porque el cleanup de arriba se quedó con ESTE array.
        const i = pendingRef.current.findIndex((p) => p.timeoutId === timeoutId);
        if (i !== -1) pendingRef.current.splice(i, 1);
        void resolvePick(role, lat, lng, seq);
      }, DOUBLE_CLICK_GUARD_MS);
      pendingRef.current.push({ timeoutId, role });
    },
    dblclick() {
      // Los dos clicks del doble click siguen agendados (el dblclick llega a
      // pocos ms del segundo): se cancelan los dos y se devuelven SUS roles.
      //
      // Solo los de los timeouts que se cancelan acá, no la lista entera: un
      // toque anterior cuyo timeout ya corrió sigue en claimedRef, en manos de
      // un resolvePick vivo. Vaciar todo le devolvía su rol al siguiente toque,
      // que entonces le pisaba el punto que ese resolvePick estaba por fijar.
      for (const { timeoutId, role } of pendingRef.current) {
        window.clearTimeout(timeoutId);
        releaseClaim(role);
      }
      pendingRef.current.length = 0;
    },
  });

  return null;
}
