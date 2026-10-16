import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconCheck, IconChevronDown } from "../map/panelIcons";
import { normalizeForSearch } from "../shared/geo";
import {
  brandHref,
  hasFastCharge,
  sortLines,
  type Catalog,
  type CatalogBrand,
  type SortKey,
} from "./catalog";
import { LineList } from "./LineList";
import styles from "./BrandPage.module.css";
import ui from "./ui.module.css";

const SORT_KEYS: SortKey[] = ["range", "battery", "charging", "consumption"];

interface BrandPageProps {
  catalog: Catalog;
  brand: CatalogBrand;
}

/** /showroom/<marca>: todos sus modelos, con orden y el filtro de carga rápida. */
export function BrandPage({ catalog, brand }: BrandPageProps) {
  const { t } = useTranslation();
  const tb = t.showroom.brand;
  const [sort, setSort] = useState<SortKey>("range");
  const [fastOnly, setFastOnly] = useState(false);

  const all = brand.lines;
  const shown = sortLines(fastOnly ? all.filter(hasFastCharge) : all, sort);

  return (
    <>
      <section aria-labelledby="h-brand" className={styles.head}>
        <div className={styles.titleRow}>
          <div className={styles.titleBlock}>
            <h1 id="h-brand" className={styles.title}>
              {brand.name}
            </h1>
            <span className={styles.summary}>{tb.summary(all.length, brand.versionCount)}</span>
          </div>
          <BrandSwitcher catalog={catalog} current={brand} />
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsRow}>
            <SortControl value={sort} onChange={setSort} />
            <button
              type="button"
              role="switch"
              aria-checked={fastOnly}
              aria-describedby="fast-help"
              className={styles.fast}
              onClick={() => setFastOnly((v) => !v)}
            >
              <span className={styles.fastBox} aria-hidden="true">
                {fastOnly && <IconCheck size={14} strokeWidth={2.4} />}
              </span>
              {tb.fastOnly}
            </button>
            <span className={styles.count} aria-live="polite">
              {tb.count(shown.length, all.length)}
            </span>
          </div>
          <p id="fast-help" className={styles.help}>
            {tb.fastHelp}
          </p>
        </div>
      </section>

      <div className={styles.list}>
        {shown.length > 0 ? (
          <LineList lines={shown} />
        ) : (
          <div className={styles.empty}>
            <span>{tb.noneFast}</span>
            <button
              type="button"
              className={[ui.btnOutline, ui.btnSmall].join(" ")}
              onClick={() => setFastOnly(false)}
            >
              {tb.showAll}
            </button>
          </div>
        )}
        {all.length === 1 && <p className={styles.single}>{tb.single(brand.name)}</p>}
      </div>
    </>
  );
}

/** Segmentado con semántica de radio: flechas para moverse, como uno nativo. */
function SortControl({ value, onChange }: { value: SortKey; onChange: (key: SortKey) => void }) {
  const { t } = useTranslation();
  const tb = t.showroom.brand;
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + SORT_KEYS.length) % SORT_KEYS.length;
    onChange(SORT_KEYS[next]!);
    refs.current[next]?.focus();
  }

  return (
    <div className={styles.sort}>
      <span id={labelId} className={styles.sortLabel}>
        {tb.sortLabel}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className={styles.segmented}>
        {SORT_KEYS.map((key, i) => (
          <button
            key={key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === key}
            tabIndex={value === key ? 0 : -1}
            className={styles.segment}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tb.sorts[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Cambiar de marca": las 78, con un filtro arriba. Escape cierra. */
function BrandSwitcher({ catalog, current }: { catalog: Catalog; current: CatalogBrand }) {
  const { t } = useTranslation();
  const tb = t.showroom.brand;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    // La marca actual a la vista dentro de la lista, no siempre la A.
    rootRef.current?.querySelector("[aria-current]")?.scrollIntoView?.({ block: "nearest" });

    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const q = normalizeForSearch(filter.trim());
  const brands = q
    ? catalog.brands.filter((b) => normalizeForSearch(b.name).includes(q))
    : catalog.brands;

  return (
    <div ref={rootRef} className={styles.switcher}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.switchButton}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setFilter("");
          setOpen((v) => !v);
        }}
      >
        {tb.switchBrand}
        <IconChevronDown size={16} />
      </button>
      {open && (
        <div id={listId} className={styles.popover}>
          <div className={styles.popoverSearch}>
            <label htmlFor={`${listId}-q`} className="sr-only">
              {tb.filterBrands}
            </label>
            <input
              ref={inputRef}
              id={`${listId}-q`}
              type="search"
              autoComplete="off"
              className={styles.popoverInput}
              placeholder={tb.filterBrands}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {brands.length > 0 ? (
            <ul className={styles.popoverList}>
              {brands.map((b) => (
                <li key={b.slug}>
                  <Link
                    to={brandHref(b)}
                    className={
                      b.slug === current.slug ? styles.popoverItemCurrent : styles.popoverItem
                    }
                    aria-current={b.slug === current.slug ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span>{b.name}</span>
                    <span className={styles.popoverCount}>{b.lines.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.popoverEmpty}>{tb.noBrands}</p>
          )}
        </div>
      )}
    </div>
  );
}
