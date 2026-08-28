import { useMemo, useRef, useState } from "react";
import { geocode } from "../api/graph";
import type { GraphNode } from "../api/graph";
import { useTranslation } from "../i18n/LanguageProvider";
import { normalizeForSearch } from "../shared/geo";
import { useDebouncedValue } from "../shared/useDebouncedValue";
import { useMapStore, type SearchableNode } from "./mapStore";
import { fromNode } from "./routePoint";
import styles from "./RouteAutocompleteField.module.css";

type Item = { type: "node"; node: SearchableNode } | { type: "geocode"; label: string };

function localMatches(query: string, nodes: SearchableNode[]): SearchableNode[] {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const scored: { node: SearchableNode; idx: number }[] = [];
  for (const n of nodes) {
    const idx = n._norm.indexOf(q);
    if (idx !== -1) scored.push({ node: n, idx });
  }
  scored.sort((a, b) => a.idx - b.idx || a.node.name.length - b.node.name.length);
  return scored.slice(0, 8).map((s) => s.node);
}

// Mira/cruz para el estado "apretado" de la chincheta. El icono cambia de
// FORMA, no solo de color: el estado activo tiene que leerse igual con
// daltonismo, con el brillo al mínimo o en una pantalla lavada por el sol.
const PIN_SVG = (
  <>
    <path d="M12 21s7-6.03 7-11a7 7 0 1 0-14 0c0 4.97 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </>
);
const CROSSHAIR_SVG = (
  <>
    <path d="M11 2h2v4h-2zM11 18h2v4h-2zM2 11h4v2H2zM18 11h4v2h-4z" />
    <path d="M12 6.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8Zm0 2a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z" />
  </>
);

interface RouteAutocompleteFieldProps {
  role: "origin" | "destination";
  placeholder: string;
  /** Este rol se está marcando AHORA: el mapa está esperando un toque. */
  isPicking: boolean;
  /** Sin nadie marcando, a este rol le toca el próximo toque del mapa. */
  isNextTarget: boolean;
  onPickTarget: () => void;
}

export function RouteAutocompleteField({
  role,
  placeholder,
  isPicking,
  isNextTarget,
  onPickTarget,
}: RouteAutocompleteFieldProps) {
  const { t } = useTranslation();
  const ra = t.map.routeAutocomplete;
  const searchableNodes = useMapStore((s) => s.searchableNodes);
  const node = useMapStore((s) => (role === "origin" ? s.originNode : s.destinationNode));
  const setNode = useMapStore((s) => (role === "origin" ? s.setOrigin : s.setDestination));
  const clearNode = useMapStore((s) => (role === "origin" ? s.clearOrigin : s.clearDestination));
  const setPickMode = useMapStore((s) => s.setPickMode);

  const [editingText, setEditingText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [result, setResult] = useState<{ text: string; kind: "warn" | "error" | "" } | null>(null);
  const [busy, setBusy] = useState(false);
  const blurTimeout = useRef<number | null>(null);

  // Si el punto se fija por una vía externa al propio input -- click en el
  // mapa (ClickToPick), "usar mi ubicación", o un replay de historial -- hay
  // que soltar cualquier texto tipeado sin confirmar, o el input queda
  // mostrando ese texto viejo para siempre en vez del nombre real del punto
  // recién elegido (editingText solo se limpiaba en chooseNode/chooseGeocode,
  // que son el camino "interno"; ver bug reportado en destino). Se ajusta
  // durante el render (patrón de React para "resetear estado cuando cambia
  // un prop") en vez de en un efecto, para no pagar un commit extra.
  //
  // Se mira la REVISION del store, no el id del nodo. Con el id, un toque del
  // mapa que resuelve al mismo nodo del grafo ya guardado no cambiaba nada --
  // el texto viejo se quedaba pegado encima de una chincheta que igual se
  // movió, y la persona veía su búsqueda a medio escribir sobre un punto que
  // ya no era el que había buscado. La revisión sube con cada escritura, sin
  // importar si el nodo resultó ser el mismo (ver mapStore.ts).
  const revision = useMapStore((s) => (role === "origin" ? s.originRevision : s.destinationRevision));
  const [prevRevision, setPrevRevision] = useState(revision);
  if (revision !== prevRevision) {
    setPrevRevision(revision);
    setEditingText(null);
    // La lista de sugerencias no se cerraba por este camino: después de un
    // toque en el mapa quedaba desplegada tapando el campo que se acababa de
    // completar sola.
    setOpen(false);
    setActiveIndex(-1);
  }

  const value = editingText ?? node?.name ?? "";
  // El input queda controlado por editingText (sin lag visual); el escaneo
  // sobre searchableNodes (hasta 3000 items, solucion.md 2.2/2.11) espera a
  // que la persona deje de tipear un instante, mismo patron que ya usa
  // useShowroomCatalog con useDebouncedValue.
  const debouncedEditingText = useDebouncedValue(editingText, 120);
  const items = useMemo<Item[]>(() => {
    const q = (debouncedEditingText ?? "").trim();
    if (!q) return [];
    const matches = localMatches(debouncedEditingText ?? "", searchableNodes).map(
      (n): Item => ({ type: "node", node: n })
    );
    if (q.length >= 3) matches.push({ type: "geocode", label: q });
    return matches;
  }, [debouncedEditingText, searchableNodes]);

  function chooseNode(n: GraphNode) {
    // Un punto del autocompletado o de la geocodificación ya viene con su
    // nombre, así que no hace falta ir a buscarlo (ver pointName.ts).
    setNode(fromNode(n));
    if (role === "origin") setPickMode("destination");
    setEditingText(null);
    setOpen(false);
    setResult(null);
  }

  async function chooseGeocode(label: string) {
    setOpen(false);
    setBusy(true);
    setResult({ text: ra.searching, kind: "" });
    try {
      const res = await geocode(label);
      chooseNode(res.node);
      let msg = ra.addressFound(res.matched_address);
      let kind: "warn" | "" = "";
      if (res.distance_to_node_km > 2) {
        msg += ra.addressImprecise(res.distance_to_node_km.toFixed(1));
        kind = "warn";
      }
      setResult({ text: msg, kind });
    } catch (err) {
      setResult({ text: err instanceof Error ? err.message : ra.addressSearchError, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  function chooseItem(item: Item | undefined) {
    if (!item) return;
    if (item.type === "node") chooseNode(item.node);
    else void chooseGeocode(item.label);
  }

  const etiqueta = ra.roleLabel(role);

  return (
    <div>
      <div className={styles.slot}>
        <span
          className={[styles.marker, role === "origin" ? styles.markerOrigin : styles.markerDest].join(" ")}
          aria-hidden="true"
        />
        <label className="sr-only" htmlFor={`${role}-input`}>
          {role === "origin" ? ra.originLabel : ra.destinationLabel}
        </label>
        <div className={styles.autocomplete}>
          <input
            id={`${role}-input`}
            type="text"
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            disabled={busy}
            onChange={(e) => {
              setResult(null);
              setEditingText(e.target.value);
              setOpen(Boolean(e.target.value.trim()));
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (value.trim()) setOpen(true);
            }}
            onBlur={() => {
              // Delay corto: si el blur vino de tocar un item de la lista, el
              // click ya alcanzo a procesar la eleccion antes de que esto cierre.
              blurTimeout.current = window.setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={(e) => {
              if (!open || items.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                chooseItem(items[activeIndex >= 0 ? activeIndex : 0]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {open && (
            <ul className={styles.list}>
              {items.length === 0 ? (
                <li className={[styles.item, styles.itemEmpty].join(" ")}>{ra.keepTyping}</li>
              ) : (
                items.map((item, i) => (
                  <li
                    key={item.type === "node" ? item.node.id : `geocode-${item.label}`}
                    className={[styles.item, item.type === "geocode" ? styles.itemGeocode : "", i === activeIndex ? styles.itemActive : ""].join(" ")}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimeout.current) window.clearTimeout(blurTimeout.current);
                      chooseItem(item);
                    }}
                  >
                    {item.type === "geocode" ? ra.searchAsAddress(item.label) : item.node.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {node && (
          <button
            type="button"
            className={styles.clear}
            title={ra.clearRole(etiqueta)}
            onClick={() => clearNode()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            <span className="sr-only">{ra.clearRole(etiqueta)}</span>
          </button>
        )}
        {/* Cada chincheta lleva el color de SU rol (el mismo blanco/violeta de
            la viñeta a la izquierda del campo y de las chinchetas del mapa):
            antes las dos eran del mismo gris apagado, así que ni se leían como
            botones ni se sabía cuál era cuál. El estado apretado cambia además
            de forma (chincheta -> mira) y de texto, no solo de color. */}
        <button
          type="button"
          className={[
            styles.pin,
            role === "destination" ? styles.pinDest : "",
            isPicking ? styles.pinActive : "",
            isNextTarget ? styles.pinNext : "",
          ].join(" ")}
          aria-pressed={isPicking}
          title={isPicking ? ra.pickOnMapActive(etiqueta) : ra.pickOnMap(etiqueta)}
          onClick={onPickTarget}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isPicking ? CROSSHAIR_SVG : PIN_SVG}
          </svg>
          <span className="sr-only">{isPicking ? ra.pickOnMapActiveSr(etiqueta) : ra.pickOnMap(etiqueta)}</span>
        </button>
      </div>
      {result && (
        <div className={[styles.result, result.kind === "warn" ? styles.resultWarn : "", result.kind === "error" ? styles.resultError : ""].join(" ")}>
          {result.text}
        </div>
      )}
    </div>
  );
}
