import { memo, useMemo } from "react";
import { CarSilhouette } from "../shared/CarSilhouette";
import { useTranslation } from "../i18n/LanguageProvider";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { familyAliases } from "./modelAlias";
import type { ModelFamily } from "./modelFamily";
import { num } from "./num";
import { useModelPhoto } from "./useModelPhoto";
import styles from "./ModelCard.module.css";

interface ModelCardProps {
  familia: ModelFamily;
  eager: boolean;
  onSelect: (id: string) => void;
}

/** "44,9" o "44,9–60,5" cuando las versiones difieren. */
function rango(familia: ModelFamily, valor: (m: ModelFamily["representante"]) => number, decimales = 0): string {
  const valores = familia.versiones.map(valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return max - min > 0.05 ? `${num(min, decimales)}–${num(max, decimales)}` : num(min, decimales);
}

// memo: hasta ~24 de estas quedan montadas en ModelGrid a la vez; sin esto
// cada una se reconciliaba en cada tecla del buscador aunque su `familia` no
// hubiera cambiado (solucion.md 2.11).
function ModelCardComponent({ familia, eager, onSelect }: ModelCardProps) {
  const { t } = useTranslation();
  const mc = t.showroom.modelCard;
  // Una tarjeta por AUTO: la familia agrupa sus versiones (48/63 kWh, GT...)
  // y la ficha deja elegir cuál. La foto se busca por el nombre limpio de la
  // familia, que es el que mejor matchea en Wikimedia.
  const model = familia.representante;
  const nombre = `${familia.marca} ${familia.nombre}`;
  // El nombre con el que se lo conoce acá, si el backend lo manda: el mismo
  // auto se vende con distinto nombre según el mercado, y la tarjeta tiene
  // que dejar claro que "este es el que vos buscabas" (QA MEDIO 9).
  const alias = useMemo(() => familyAliases(familia.versiones), [familia.versiones]);
  const { ref, photo } = useModelPhoto(
    nombre,
    eager,
    model.foto_url ? { url: model.foto_url, credito: model.foto_credito } : undefined
  );

  return (
    <article
      className={styles.card}
      tabIndex={0}
      role="button"
      onClick={() => onSelect(model.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(model.id);
        }
      }}
    >
      <div className={styles.art} ref={ref}>
        {!(photo?.encontrada && photo.url) && (
          <CarSilhouette name={nombre} className={styles.silueta} />
        )}
        {photo?.encontrada && photo.url && (
          <img
            className={styles.foto}
            src={cloudinaryResize(photo.url, 400)}
            alt=""
            loading="lazy"
          />
        )}
        {model.fuente === "ia" && <span className={styles.badge}>{mc.badgeIa}</span>}
        {familia.versiones.length > 1 && (
          <span className={styles.badgeVersiones}>{mc.badgeVersiones(familia.versiones.length)}</span>
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.marca}>{familia.marca}</p>
        <h3 className={styles.modelo}>{familia.nombre}</h3>
        {alias.length > 0 && <p className={styles.alias}>{mc.aliasTexto(alias[0]!)}</p>}
        <dl className={styles.specs}>
          <div>
            <dt>{mc.statBateria}</dt>
            <dd className="mono-num">{rango(familia, (m) => m.bateria_kwh, 1)} kWh</dd>
          </div>
          <div>
            <dt>{mc.statAutonomia}</dt>
            <dd className="mono-num">{rango(familia, (m) => m.autonomia_aprox_km)} km</dd>
          </div>
          <div>
            <dt>{mc.statCarga}</dt>
            <dd className="mono-num">{rango(familia, (m) => m.potencia_carga_kw)} kW</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export const ModelCard = memo(ModelCardComponent);
