import type { Ref } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconArrowRight, IconChevronRight } from "../landing/landingIcons";
import { brandHref, featuredBrands, type Catalog, type CatalogBrand } from "./catalog";
import { useFormat } from "./format";
import { SearchField } from "./SearchField";
import styles from "./BrandIndex.module.css";

interface IndexHeroProps {
  catalog: Catalog;
  query: string;
  onQueryChange: (q: string) => void;
  inputRef: Ref<HTMLInputElement>;
}

/** La cabecera de /showroom: título, cuánto hay en el catálogo y el buscador grande. */
export function IndexHero({ catalog, query, onQueryChange, inputRef }: IndexHeroProps) {
  const { t } = useTranslation();
  const ti = t.showroom.index;
  const f = useFormat();

  return (
    <section aria-labelledby="h-index" className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroInner}>
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          {ti.eyebrow}
        </span>
        <h1 id="h-index" className={styles.title}>
          {ti.title}
        </h1>
        <p className={styles.intro}>
          <strong className={styles.count}>{f.n(catalog.lineCount)}</strong>{" "}
          {ti.intro(catalog.brands.length)}
        </p>
        <SearchField
          id="q-hero"
          size="hero"
          value={query}
          onChange={onQueryChange}
          inputRef={inputRef}
        />
        <span className={styles.hint}>{ti.searchHint}</span>
      </div>
    </section>
  );
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Las dos puntas del catálogo: las marcas grandes a un clic, y todas de la A a
 * la Z con una barra de letras para no scrollear las 78. Las que tienen un
 * solo modelo van directo a su ficha y lo anuncian con el nombre del modelo.
 */
export function IndexBody({ catalog }: { catalog: Catalog }) {
  const { t } = useTranslation();
  const ti = t.showroom.index;
  const featured = featuredBrands(catalog);

  const groups = new Map<string, CatalogBrand[]>();
  for (const brand of catalog.brands) {
    const list = groups.get(brand.letter) ?? [];
    list.push(brand);
    groups.set(brand.letter, list);
  }
  const letters = [...LETTERS, ...(groups.has("#") ? ["#"] : [])];

  function goToLetter(letter: string) {
    const group = document.getElementById(`az-${letter}`);
    if (!group) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    group.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // El foco sigue al salto: con teclado, el próximo Tab arranca en esa letra.
    group.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  }

  return (
    <>
      <section aria-labelledby="h-top" className={styles.featured}>
        <div className={styles.sectionHead}>
          <h2 id="h-top" className={styles.h2}>
            {ti.featuredTitle}
          </h2>
          <span className={styles.sectionNote}>{ti.featuredNote}</span>
        </div>
        <ul className={styles.featuredGrid}>
          {featured.map((brand) => (
            <li key={brand.slug}>
              <Link to={brandHref(brand)} className={styles.brandCard}>
                <span className={styles.brandName}>{brand.name}</span>
                <span className={styles.brandMeta}>
                  <span>
                    <span className={styles.brandCount}>{brand.lines.length}</span>{" "}
                    {ti.models(brand.lines.length)}
                    <span className={styles.brandVersions}>
                      {" "}
                      · {ti.versions(brand.versionCount)}
                    </span>
                  </span>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-az" className={styles.az}>
        <h2 id="h-az" className={styles.h2}>
          {ti.azTitle(catalog.brands.length)}
        </h2>
        <nav aria-label={ti.lettersLabel} className={styles.letterBar}>
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              className={styles.letter}
              disabled={!groups.has(letter)}
              aria-label={ti.letterAria(letter)}
              onClick={() => goToLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </nav>
        <div className={styles.azCols}>
          {letters
            .filter((letter) => groups.has(letter))
            .map((letter) => (
              <div key={letter} id={`az-${letter}`} className={styles.group}>
                <h3 className={styles.groupLetter} tabIndex={-1}>
                  {letter}
                </h3>
                <ul className={styles.groupList}>
                  {groups.get(letter)!.map((brand) => {
                    const only = brand.lines.length === 1 ? brand.lines[0] : undefined;
                    return (
                      <li key={brand.slug}>
                        <Link to={brandHref(brand)} className={styles.azRow}>
                          <span className={styles.azName}>{brand.name}</span>
                          <span className={styles.azRight}>
                            {only ? (
                              <>
                                {only.name}
                                <IconArrowRight size={14} />
                              </>
                            ) : (
                              <>
                                {brand.lines.length}
                                <span className="sr-only"> {ti.models(brand.lines.length)}</span>
                              </>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
        <p className={styles.directNote}>
          <IconArrowRight size={14} />
          {ti.directNote}
        </p>
      </section>
    </>
  );
}
