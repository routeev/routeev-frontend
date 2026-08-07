import type L from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "../shared/format";
import { num } from "./num";
import { armarSegmentos, puntoDeSegmento, segmentoEnTiempo, type Segment, type TramoInfo } from "./simulationTimeline";

function formatBateriaPct(kwh: number, capacidadKwh: number): string {
  const pct = Math.max(0, Math.min(100, (kwh / capacidadKwh) * 100));
  return `${pct.toFixed(0)}%`;
}

/**
 * Motor de la animación del viaje simulado, portado de iniciarSimulacionMapa
 * en js/showroom.js. Actualiza el marcador de Leaflet y el panel de
 * telemetría en vivo de forma IMPERATIVA (refs, no useState) en cada cuadro
 * -- a 60fps por varios segundos, pasar esto por el estado de React
 * multiplicaría renders sin necesidad; es exactamente el motivo por el que
 * el original tampoco lo hace por el DOM virtual.
 */
export function useSimulationAnimation(
  tramosInfo: TramoInfo[],
  capacidadKwh: number,
  bateriaInicialPct: number,
  tiempoTotalMin: number
) {
  const markerRef = useRef<L.Marker | null>(null);
  const kmRef = useRef<HTMLElement | null>(null);
  const batRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  const pintar = useCallback(
    (seg: Segment, p: number, totalKm: number, totalMs: number) => {
      const [lat, lon] = puntoDeSegmento(seg, p);
      markerRef.current?.setLatLng([lat, lon]);

      const kmGlobal = seg.type === "drive" ? seg.kmGlobalFrom + (seg.kmGlobalTo - seg.kmGlobalFrom) * p : seg.kmGlobal;
      const battKwh = seg.battFrom + (seg.battTo - seg.battFrom) * p;
      const elapsedMs = seg.startMs + seg.durationMs * p;
      const tiempoTranscurridoMin = totalMs > 0 ? (elapsedMs / totalMs) * tiempoTotalMin : 0;

      if (kmRef.current) kmRef.current.textContent = `${num(kmGlobal, 1)} / ${num(totalKm, 1)} km`;
      if (batRef.current) batRef.current.textContent = formatBateriaPct(battKwh, capacidadKwh);
      if (timeRef.current) timeRef.current.textContent = `${formatDuration(tiempoTranscurridoMin)} / ${formatDuration(tiempoTotalMin)}`;
      if (fillRef.current) {
        fillRef.current.style.width = `${Math.min(100, (kmGlobal / Math.max(0.001, totalKm)) * 100)}%`;
        fillRef.current.classList.toggle("charging", seg.type === "charge");
      }
      if (statusRef.current) {
        if (seg.type === "charge") {
          statusRef.current.textContent = `Cargando en ${seg.parada.nombre}… (+${num(seg.parada.kwh, 1)} kWh, ${formatDuration(seg.parada.minutos)} reales)`;
          statusRef.current.classList.add("charging");
          statusRef.current.classList.remove("done");
        } else if (seg.type === "turn") {
          statusRef.current.textContent = "Llegó al destino. Iniciando la vuelta…";
          statusRef.current.classList.remove("charging", "done");
        } else {
          statusRef.current.textContent = seg.tramo.nombre === "vuelta" ? "Volviendo…" : "En ruta…";
          statusRef.current.classList.remove("charging", "done");
        }
      }
    },
    [capacidadKwh, tiempoTotalMin]
  );

  const play = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (tramosInfo.some((t) => t.coords.length < 2)) return; // sin geometria: nada que animar

    setPlaying(true);
    setFinished(false);
    const bateriaInicialKwh = (capacidadKwh * bateriaInicialPct) / 100;
    const { segments, totalMs, totalKm } = armarSegmentos(tramosInfo, bateriaInicialKwh);
    markerRef.current?.setLatLng(tramosInfo[0]!.coords[0]!);

    const terminar = () => {
      const last = segments[segments.length - 1]!;
      pintar(last, 1, totalKm, totalMs);
      if (statusRef.current) {
        statusRef.current.textContent = tramosInfo.length > 1 ? "Ida y vuelta completa." : "Llegó a destino.";
        statusRef.current.classList.remove("charging");
        statusRef.current.classList.add("done");
      }
      fillRef.current?.classList.remove("charging");
      setPlaying(false);
      setFinished(true);
    };

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      terminar();
      return;
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      const elapsed = now - t0;
      const { seg, p } = segmentoEnTiempo(segments, elapsed);
      pintar(seg, p, totalKm, totalMs);
      if (elapsed >= totalMs) {
        terminar();
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [tramosInfo, capacidadKwh, bateriaInicialPct, pintar]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { markerRef, kmRef, batRef, timeRef, fillRef, statusRef, playing, finished, play };
}
