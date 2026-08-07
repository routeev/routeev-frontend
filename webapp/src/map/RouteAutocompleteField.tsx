import { useMemo, useRef, useState } from "react";
import { geocode } from "../api/graph";
import type { GraphNode } from "../api/graph";
import { normalizeForSearch } from "../shared/geo";
import { useMapStore, type SearchableNode } from "./mapStore";
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

interface RouteAutocompleteFieldProps {
  role: "origin" | "destination";
  placeholder: string;
  isPickTarget: boolean;
  onPickTarget: () => void;
}

export function RouteAutocompleteField({ role, placeholder, isPickTarget, onPickTarget }: RouteAutocompleteFieldProps) {
  const searchableNodes = useMapStore((s) => s.searchableNodes);
  const node = useMapStore((s) => (role === "origin" ? s.originNode : s.destinationNode));
  const setNode = useMapStore((s) => (role === "origin" ? s.setOrigin : s.setDestination));
  const setPickMode = useMapStore((s) => s.setPickMode);

  const [editingText, setEditingText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [result, setResult] = useState<{ text: string; kind: "warn" | "error" | "" } | null>(null);
  const [busy, setBusy] = useState(false);
  const blurTimeout = useRef<number | null>(null);

  const value = editingText ?? node?.name ?? "";
  const items = useMemo<Item[]>(() => {
    const q = (editingText ?? "").trim();
    if (!q) return [];
    const matches = localMatches(editingText ?? "", searchableNodes).map((n): Item => ({ type: "node", node: n }));
    if (q.length >= 3) matches.push({ type: "geocode", label: q });
    return matches;
  }, [editingText, searchableNodes]);

  function chooseNode(n: GraphNode) {
    setNode(n);
    if (role === "origin") setPickMode("destination");
    setEditingText(null);
    setOpen(false);
    setResult(null);
  }

  async function chooseGeocode(label: string) {
    setOpen(false);
    setBusy(true);
    setResult({ text: "Buscando...", kind: "" });
    try {
      const res = await geocode(label);
      useMapStore.getState().addNode(res.node);
      chooseNode(res.node);
      let msg = `Encontrado: ${res.matched_address}`;
      let kind: "warn" | "" = "";
      if (res.distance_to_node_km > 2) {
        msg += ` (a ${res.distance_to_node_km.toFixed(1)} km de la calle más cercana del grafo cubierto -- puede no ser precisa)`;
        kind = "warn";
      }
      setResult({ text: msg, kind });
    } catch (err) {
      setResult({ text: err instanceof Error ? err.message : "No se pudo buscar esa dirección.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  function chooseItem(item: Item | undefined) {
    if (!item) return;
    if (item.type === "node") chooseNode(item.node);
    else void chooseGeocode(item.label);
  }

  return (
    <div>
      <div className={styles.slot}>
        <span
          className={[styles.marker, role === "origin" ? styles.markerOrigin : styles.markerDest].join(" ")}
          aria-hidden="true"
        />
        <label className="sr-only" htmlFor={`${role}-input`}>
          {role === "origin" ? "Origen" : "Destino"}
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
                <li className={[styles.item, styles.itemEmpty].join(" ")}>Seguí escribiendo para buscar...</li>
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
                    {item.type === "geocode" ? `Buscar «${item.label}» como dirección completa` : item.node.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          className={[styles.pin, isPickTarget ? "active" : ""].join(" ")}
          aria-pressed={isPickTarget}
          title={`Marcar el ${role === "origin" ? "origen" : "destino"} tocando el mapa`}
          onClick={onPickTarget}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s7-6.03 7-11a7 7 0 1 0-14 0c0 4.97 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
          <span className="sr-only">Marcar el {role === "origin" ? "origen" : "destino"} tocando el mapa</span>
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
