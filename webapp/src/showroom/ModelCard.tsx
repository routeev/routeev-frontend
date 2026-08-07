import type { ShowroomModel } from "../api/showroom";
import { CarSilhouette } from "../shared/CarSilhouette";
import { num } from "./num";
import { useModelPhoto } from "./useModelPhoto";
import styles from "./ModelCard.module.css";

interface ModelCardProps {
  model: ShowroomModel;
  eager: boolean;
  onSelect: (id: string) => void;
}

export function ModelCard({ model, eager, onSelect }: ModelCardProps) {
  const nombre = `${model.marca} ${model.modelo}`;
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
        {!(photo?.encontrada && photo.url) && <CarSilhouette name={nombre} className={styles.silueta} />}
        {photo?.encontrada && photo.url && <img className={styles.foto} src={photo.url} alt="" />}
        {model.fuente === "ia" && <span className={styles.badge}>IA</span>}
      </div>
      <div className={styles.body}>
        <p className={styles.marca}>{model.marca}</p>
        <h3 className={styles.modelo}>{model.modelo}</h3>
        <dl className={styles.specs}>
          <div>
            <dt>Batería</dt>
            <dd className="mono-num">{num(model.bateria_kwh, 1)} kWh</dd>
          </div>
          <div>
            <dt>Autonomía</dt>
            <dd className="mono-num">{num(model.autonomia_aprox_km)} km</dd>
          </div>
          <div>
            <dt>Carga</dt>
            <dd className="mono-num">{num(model.potencia_carga_kw)} kW</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
