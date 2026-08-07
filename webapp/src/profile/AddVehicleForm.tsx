import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createVehicle, listEvModels, lookupVehicleAiPhoto, uploadVehiclePhoto, type EvModel } from "../api/vehicles";
import { Banner } from "../shared/Banner";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import styles from "./ProfilePage.module.css";

const emptyForm = { name: "", capacity: "", consumption: "", chargingPower: "" };

interface AddVehicleFormProps {
  onCreated: () => void;
}

export function AddVehicleForm({ onCreated }: AddVehicleFormProps) {
  const modelsQuery = useQuery({ queryKey: ["evModels"], queryFn: listEvModels });
  const [form, setForm] = useState(emptyForm);
  const [modelSearch, setModelSearch] = useState("");
  const [modelPhoto, setModelPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La foto que identificó el auto queda pendiente y se sube como foto del
  // vehículo recién creado (mismo flujo que la app móvil).
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const models = modelsQuery.data;
  const modelsByLabel = useMemo(() => {
    const map = new Map<string, EvModel>();
    for (const m of models ?? []) map.set(`${m.marca} ${m.modelo}`, m);
    return map;
  }, [models]);

  const identify = useMutation({
    mutationFn: async (file: File) => {
      const resized = await resizePhotoForUpload(file);
      const model = await lookupVehicleAiPhoto(resized);
      return { model, resized };
    },
    onSuccess: ({ model, resized }) => {
      setPendingPhoto(resized);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(resized);
      });
      setForm({
        name: [model.marca, model.modelo].filter(Boolean).join(" "),
        capacity: model.bateria_kwh != null ? String(model.bateria_kwh) : "",
        consumption: model.consumo_kwh_km != null ? String(model.consumo_kwh_km) : "",
        chargingPower: model.potencia_carga_kw != null ? String(model.potencia_carga_kw) : "",
      });
      setPhotoStatus({ text: `Identificado: ${model.marca} ${model.modelo}. Revisá los datos y guardá.`, ok: true });
    },
    onError: (err) => {
      setPhotoStatus({ text: err instanceof Error ? err.message : "No se pudo identificar el vehículo con esa foto.", ok: false });
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const vehicle = await createVehicle({
        name: form.name.trim(),
        battery_capacity_kwh: Number(form.capacity),
        consumption_kwh_per_km: Number(form.consumption),
        charging_power_kw: Number(form.chargingPower),
      });
      if (pendingPhoto) {
        // Si falla, el vehículo ya quedó creado: no bloqueamos el flujo
        // principal por un paso secundario (mismo criterio que la app móvil).
        try {
          await uploadVehiclePhoto(vehicle.id, pendingPhoto);
        } catch {
          /* no bloquea */
        }
      }
      return vehicle;
    },
    onSuccess: () => {
      setForm(emptyForm);
      setModelSearch("");
      setModelPhoto(null);
      setPendingPhoto(null);
      setPhotoStatus(null);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      onCreated();
    },
    // Acá cae, entre otros, el 409 de nombre repetido: el backend ya manda un
    // mensaje explicando cuál es el nombre que choca.
    onError: (err) => setError(err instanceof Error ? err.message : "No se pudo crear el vehículo."),
  });

  function onModelSearchChange(value: string) {
    setModelSearch(value);
    const model = modelsByLabel.get(value.trim());
    if (!model) return;
    setForm({
      name: `${model.marca} ${model.modelo}`,
      capacity: String(model.bateria_kwh),
      consumption: String(model.consumo_kwh_km),
      chargingPower: String(model.potencia_carga_kw),
    });
    setModelPhoto(model.foto_url ?? null);
  }

  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        create.mutate();
      }}
    >
      <div className={styles.photoIdRow}>
        <label className={styles.photoIdBtn}>
          <span aria-hidden="true">📷</span> Identificar con una foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setPhotoStatus({ text: "Identificando el vehículo con IA...", ok: false });
              identify.mutate(file);
            }}
          />
        </label>
        {photoPreview && <img src={photoPreview} className={styles.photoIdPreview} alt="" />}
      </div>
      {photoStatus && <div className={["hint", photoStatus.ok ? "hint-ok" : ""].join(" ")}>{photoStatus.text}</div>}

      <div className={styles.formDivider}>
        <span>o buscá / completá a mano</span>
      </div>

      <div className="field">
        <label htmlFor="p-model-search">Modelo (opcional, precarga los datos)</label>
        <input
          id="p-model-search"
          type="text"
          list="p-model-datalist"
          autoComplete="off"
          placeholder="Escribí para buscar (ej. Nissan Leaf, Tesla Model 3)..."
          value={modelSearch}
          onChange={(e) => onModelSearchChange(e.target.value)}
        />
        <datalist id="p-model-datalist">
          {[...modelsByLabel.keys()].map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
        {modelPhoto && <img src={modelPhoto} className={styles.modelPhotoPreview} alt="" />}
      </div>

      <div className="field">
        <label htmlFor="p-name">Nombre</label>
        <input
          type="text"
          id="p-name"
          required
          placeholder="ej. Nissan Leaf"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor="p-capacity">Batería (kWh)</label>
          <input
            id="p-capacity"
            type="number"
            step="any"
            min={0.1}
            required
            placeholder="40"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="p-consumption">Consumo (kWh/km)</label>
          <input
            id="p-consumption"
            type="number"
            step="any"
            min={0.01}
            required
            placeholder="0.18"
            value={form.consumption}
            onChange={(e) => setForm((f) => ({ ...f, consumption: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="p-charging-power">Carga (kW)</label>
          <input
            id="p-charging-power"
            type="number"
            step="any"
            min={0.5}
            required
            placeholder="22"
            value={form.chargingPower}
            onChange={(e) => setForm((f) => ({ ...f, chargingPower: e.target.value }))}
          />
        </div>
      </div>

      {error && <Banner variant="error">{error}</Banner>}
      <button type="submit" className="primary small" disabled={create.isPending}>
        {create.isPending ? "Creando..." : "Crear vehículo"}
      </button>
    </form>
  );
}
