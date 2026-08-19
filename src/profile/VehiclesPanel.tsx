import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteVehicle, deleteVehiclePhoto, listVehicles, uploadVehiclePhoto } from "../api/vehicles";
import { Banner } from "../shared/Banner";
import { useTranslation } from "../i18n/LanguageProvider";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { AddVehicleForm } from "./AddVehicleForm";
import { VehicleCard } from "./VehicleCard";
import { vehiclePhotoQueryKey } from "./useVehiclePhoto";
import styles from "./ProfilePage.module.css";

export function VehiclesPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const vehiclesQuery = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  // La foto vieja (si había) queda cacheada como blob URL en React Query
  // (ver useVehiclePhoto.ts) -- sin revocarla acá quedaría viva en memoria
  // para siempre, y sin invalidar la query se seguiría mostrando esa misma
  // blob URL (ya desactualizada) en vez de pedir la nueva.
  const invalidatePhoto = (vehicleId: number) => {
    const key = vehiclePhotoQueryKey(vehicleId);
    const old = queryClient.getQueryData<string | null>(key);
    if (old) URL.revokeObjectURL(old);
    queryClient.invalidateQueries({ queryKey: key });
  };

  const uploadPhoto = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => uploadVehiclePhoto(id, await resizePhotoForUpload(file)),
    onSuccess: (_data, { id }) => {
      refresh();
      invalidatePhoto(id);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t.profile.vehiclesPanel.photoUploadError),
  });

  const removePhoto = useMutation({
    mutationFn: (id: number) => deleteVehiclePhoto(id),
    onSuccess: (_data, id) => {
      refresh();
      invalidatePhoto(id);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t.profile.vehiclesPanel.photoRemoveError),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: (_data, id) => {
      refresh();
      invalidatePhoto(id);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t.profile.vehiclesPanel.deleteError),
  });

  const vehicles = vehiclesQuery.data ?? [];
  const busy = uploadPhoto.isPending || removePhoto.isPending || remove.isPending;

  return (
    <section className="panel">
      <div className={styles.panelHeader}>
        <h2>{t.profile.vehiclesPanel.title}</h2>
        <button type="button" className="primary small" onClick={() => setFormOpen((v) => !v)}>
          {t.profile.vehiclesPanel.addVehicle}
        </button>
      </div>
      <p className="hint">{t.profile.vehiclesPanel.hint}</p>

      {formOpen && (
        <AddVehicleForm
          onCreated={() => {
            setFormOpen(false);
            void refresh();
          }}
        />
      )}

      {error && <Banner variant="error">{error}</Banner>}

      {vehiclesQuery.isSuccess && vehicles.length === 0 && (
        <p className="hint">{t.profile.vehiclesPanel.emptyState}</p>
      )}

      <div className={styles.vehicleGrid}>
        {vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            busy={busy}
            onUploadPhoto={(file) => {
              setError(null);
              uploadPhoto.mutate({ id: v.id, file });
            }}
            onRemovePhoto={() => {
              if (!confirm(t.profile.vehiclesPanel.confirmRemovePhoto(v.name))) return;
              setError(null);
              removePhoto.mutate(v.id);
            }}
            onDelete={() => {
              if (!confirm(t.profile.vehiclesPanel.confirmDelete(v.name))) return;
              setError(null);
              remove.mutate(v.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}
