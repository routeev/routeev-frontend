import type { Vehicle } from "../api/vehicles";
import { CarSilhouette } from "../shared/CarSilhouette";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { useTranslation } from "../i18n/LanguageProvider";
import { useVehiclePhoto } from "./useVehiclePhoto";
import styles from "./ProfilePage.module.css";

interface VehicleCardProps {
  vehicle: Vehicle;
  busy: boolean;
  onUploadPhoto: (file: File) => void;
  onRemovePhoto: () => void;
  onDelete: () => void;
}

export function VehicleCard({ vehicle, busy, onUploadPhoto, onRemovePhoto, onDelete }: VehicleCardProps) {
  const { t } = useTranslation();
  const photoUrl = useVehiclePhoto(vehicle.id, vehicle.has_photo);
  const autonomiaKm = vehicle.consumption_kwh_per_km
    ? vehicle.battery_capacity_kwh / vehicle.consumption_kwh_per_km
    : null;

  return (
    <article className={styles.vehicleCard}>
      <div className={styles.artWrap}>
        {/* Tu foto primero; si no hay, la del modelo del catálogo (con su
            crédito: son CC BY-SA, no se pueden mostrar sin atribuir); y la
            silueta solo cuando el nombre no es de ningún modelo conocido.
            Con foto propia todavía cargando NO se muestra la del modelo: se
            vería un instante y después se cambiaría por la otra. */}
        {photoUrl ? (
          <img className={styles.vehiclePhoto} src={photoUrl} alt="" />
        ) : !vehicle.has_photo && vehicle.foto_modelo_url ? (
          <figure className={styles.stockPhoto}>
            <img
              className={styles.vehiclePhoto}
              src={cloudinaryResize(vehicle.foto_modelo_url, 400)}
              alt=""
              loading="lazy"
            />
            <figcaption className={styles.stockCredit}>
              {vehicle.foto_modelo_credito?.archivo_url ? (
                <a
                  href={vehicle.foto_modelo_credito.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.profile.vehicleCard.stockPhotoCredit(vehicle.foto_modelo_credito)}
                </a>
              ) : (
                t.profile.vehicleCard.stockPhotoCredit(vehicle.foto_modelo_credito ?? undefined)
              )}
            </figcaption>
          </figure>
        ) : (
          <CarSilhouette name={vehicle.name} className={styles.art} />
        )}
        <label className={styles.photoEdit} title={vehicle.has_photo ? t.profile.vehicleCard.changePhoto : t.profile.vehicleCard.addPhoto}>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // permite elegir el mismo archivo dos veces seguidas
              if (file) onUploadPhoto(file);
            }}
          />
          <span aria-hidden="true">{vehicle.has_photo ? "✎" : "📷"}</span>
          <span className="sr-only">
            {vehicle.has_photo ? t.profile.vehicleCard.changePhoto : t.profile.vehicleCard.addPhoto}
          </span>
        </label>
      </div>

      <div>
        <h3 className={styles.vehicleName}>{vehicle.name}</h3>
        <dl className={styles.vehicleSpecs}>
          <div>
            <dt>{t.profile.vehicleCard.battery}</dt>
            <dd className="mono-num">{vehicle.battery_capacity_kwh} kWh</dd>
          </div>
          <div>
            <dt>{t.profile.vehicleCard.consumption}</dt>
            <dd className="mono-num">{vehicle.consumption_kwh_per_km} kWh/km</dd>
          </div>
          <div>
            <dt>{t.profile.vehicleCard.charging}</dt>
            <dd className="mono-num">{vehicle.charging_power_kw} kW</dd>
          </div>
          <div>
            <dt>{t.profile.vehicleCard.range}</dt>
            <dd className="mono-num">{autonomiaKm ? `${autonomiaKm.toFixed(0)} km` : "-"}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.cardActions}>
        {vehicle.has_photo ? (
          <button type="button" className="ghost small" disabled={busy} onClick={onRemovePhoto}>
            {t.profile.vehicleCard.removePhoto}
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="ghost small" disabled={busy} onClick={onDelete} title={t.profile.vehicleCard.deleteTitle}>
          {t.profile.vehicleCard.delete}
        </button>
      </div>
    </article>
  );
}
