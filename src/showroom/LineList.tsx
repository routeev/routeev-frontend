import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconChevronRight } from "../landing/landingIcons";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { useMediaQuery } from "../shared/useMediaQuery";
import { linePath, type CatalogLine } from "./catalog";
import { useFormat, type Format } from "./format";
import { CarOutline, IconSpark } from "./showroomIcons";
import { useModelPhoto } from "./useModelPhoto";
import styles from "./LineList.module.css";
import ui from "./ui.module.css";

/** Las de la primera pantalla piden su foto ya; el resto, al acercarse. */
const EAGER_PHOTOS = 8;

interface LineListProps {
  lines: CatalogLine[];
  /** En los resultados de búsqueda va la marca arriba del nombre. */
  showBrand?: boolean;
}

/**
 * Los modelos de una marca (o de una búsqueda). Escritorio: tarjetas con
 * foto. Celular: filas de 72px como el showroom de la app, sin foto, para que
 * entren ocho por pantalla y la autonomía se lea de una.
 */
export function LineList({ lines, showBrand = false }: LineListProps) {
  const desktop = useMediaQuery("(min-width: 900px)");
  const f = useFormat();

  if (desktop) {
    return (
      <ul className={styles.grid}>
        {lines.map((line, i) => (
          <li key={`${line.brandSlug}/${line.slug}`}>
            <ModelCard line={line} showBrand={showBrand} eager={i < EAGER_PHOTOS} f={f} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.rows}>
      {lines.map((line) => (
        <li key={`${line.brandSlug}/${line.slug}`}>
          <ModelRow line={line} showBrand={showBrand} f={f} />
        </li>
      ))}
    </ul>
  );
}

interface ItemProps {
  line: CatalogLine;
  showBrand: boolean;
  f: Format;
}

function specs(line: CatalogLine, f: Format) {
  return `${f.range(line.minBattery, line.maxBattery, 1)} kWh · ${f.range(line.minCharge, line.maxCharge)} kW`;
}

// memo: una marca grande o una búsqueda amplia monta decenas de estas, y sin
// esto se reconciliaban todas en cada tecla del buscador.
const ModelCard = memo(function ModelCard({
  line,
  showBrand,
  eager,
  f,
}: ItemProps & { eager: boolean }) {
  const { t } = useTranslation();
  const tc = t.showroom.card;
  const { ref, photo } = useModelPhoto(`${line.brand} ${line.name}`, eager, line.photo);
  const km = f.range(line.minRange, line.maxRange);
  const found = photo?.encontrada && photo.url;

  return (
    <Link
      to={linePath(line)}
      className={styles.card}
      aria-label={tc.aria(`${line.brand} ${line.name}`, km)}
    >
      <div className={styles.art} ref={ref}>
        {found ? (
          <img
            className={styles.photo}
            src={cloudinaryResize(photo.url, 400)}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          // Mientras se busca la foto queda el fondo solo; la silueta es para
          // cuando ya se sabe que no hay.
          photo && (
            <span className={styles.noPhoto} aria-hidden="true">
              <CarOutline />
              <span>{tc.noPhoto}</span>
            </span>
          )
        )}
        {(line.versions.length > 1 || line.ai) && (
          <span className={styles.tags}>
            {line.versions.length > 1 && (
              <span className={ui.pill}>{t.showroom.index.versions(line.versions.length)}</span>
            )}
            {line.ai && (
              <span className={[ui.pill, ui.pillStrong].join(" ")}>
                <IconSpark />
                {tc.ai}
              </span>
            )}
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.names}>
          {showBrand && <span className={styles.brand}>{line.brand}</span>}
          <span className={styles.name}>{line.name}</span>
          {line.aliases[0] && <span className={styles.local}>{tc.local(line.aliases[0])}</span>}
        </div>
        <div className={styles.rangeBlock}>
          <span className={styles.km}>
            {km}
            <span className={styles.kmUnit}>km</span>
          </span>
          <span className={styles.rangeLabel}>{tc.realRange}</span>
        </div>
        <span className={styles.spec}>{specs(line, f)}</span>
      </div>
    </Link>
  );
});

const ModelRow = memo(function ModelRow({ line, showBrand, f }: ItemProps) {
  const { t } = useTranslation();
  const tc = t.showroom.card;
  const km = f.range(line.minRange, line.maxRange);
  const extra = [
    specs(line, f),
    line.aliases[0],
    line.versions.length > 1 ? t.showroom.index.versions(line.versions.length) : undefined,
  ].filter(Boolean);

  return (
    <Link
      to={linePath(line)}
      className={styles.row}
      aria-label={tc.aria(`${line.brand} ${line.name}`, km)}
    >
      <span className={styles.rowMain}>
        {showBrand && <span className={styles.brand}>{line.brand}</span>}
        <span className={styles.rowName}>
          <span className={styles.rowNameText}>{line.name}</span>
          {line.ai && <span className={[ui.pill, ui.pillSmall].join(" ")}>{tc.ai}</span>}
        </span>
        <span className={styles.rowSpec}>{extra.join(" · ")}</span>
      </span>
      <span className={styles.rowRange}>
        <span className={styles.rowKm}>
          {km}
          <span className={styles.rowKmUnit}>km</span>
        </span>
        <span className={styles.rangeLabel}>{tc.range}</span>
      </span>
      <IconChevronRight />
    </Link>
  );
});
