import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteVehicle, deleteVehiclePhoto, listVehicles, uploadVehiclePhoto } from "../api/vehicles";
import { Banner } from "../shared/Banner";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { AddVehicleForm } from "./AddVehicleForm";
import { VehicleCard } from "./VehicleCard";
import styles from "./ProfilePage.module.css";

export function VehiclesPanel() {
  const queryClient = useQueryClient();
  const vehiclesQuery = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  const uploadPhoto = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => uploadVehiclePhoto(id, await resizePhotoForUpload(file)),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo subir la foto."),
  });

  const removePhoto = useMutation({
    mutationFn: (id: number) => deleteVehiclePhoto(id),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo quitar la foto."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo eliminar el vehículo."),
  });

  const vehicles = vehiclesQuery.data ?? [];
  const busy = uploadPhoto.isPending || removePhoto.isPending || remove.isPending;

  return (
    <section className="panel">
      <div className={styles.panelHeader}>
        <h2>Mis vehículos</h2>
        <button type="button" className="primary small" onClick={() => setFormOpen((v) => !v)}>
          + Agregar vehículo
        </button>
      </div>
      <p className="hint">Los vehículos que podés elegir al calcular una ruta.</p>

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
        <p className="hint">Todavía no cargaste ningún vehículo.</p>
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
              if (!confirm(`¿Quitar la foto de «${v.name}»?`)) return;
              setError(null);
              removePhoto.mutate(v.id);
            }}
            onDelete={() => {
              if (!confirm(`¿Eliminar «${v.name}»? Los viajes que ya hiciste con él se mantienen en el historial.`)) return;
              setError(null);
              remove.mutate(v.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}
