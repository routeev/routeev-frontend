import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { authConfig } from "../api/auth";
import { createVehicle, lookupVehicleAi } from "../api/vehicles";
import { Banner } from "../shared/Banner";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { MODEL_SEARCH_MIN_CHARS, filterModelLabels } from "../shared/evModelSearch";
import { readNumberInput } from "../shared/readNumberInput";
import { useMapStore, vehicleAutonomyKm } from "./mapStore";
import { useEvModels } from "./useMapLoaders";
import styles from "./VehiclePanel.module.css";

const emptyForm = { name: "", capacity: "", consumption: "", chargingPower: "" };

export function VehiclePanel() {
  const vehicles = useMapStore((s) => s.vehicles);
  const vehiclesLoaded = useMapStore((s) => s.vehiclesLoaded);
  const selectedVehicleId = useMapStore((s) => s.selectedVehicleId);
  const selectVehicle = useMapStore((s) => s.selectVehicle);
  const addVehicle = useMapStore((s) => s.addVehicle);
  const startBatteryPct = useMapStore((s) => s.startBatteryPct);
  const setStartBatteryPct = useMapStore((s) => s.setStartBatteryPct);

  const evModels = useEvModels();
  const cfgQuery = useQuery({ queryKey: ["authConfig"], queryFn: authConfig, retry: false });
  const aiEnabled = Boolean(cfgQuery.data?.ai_vehicle_lookup_enabled);

  const [formOpen, setFormOpen] = useState(vehicles.length === 0);
  const [form, setForm] = useState(emptyForm);
  const [modelSearch, setModelSearch] = useState("");
  const [modelPhoto, setModelPhoto] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<{ text: string; error: boolean } | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const evModelsByLabel = useMemo(() => {
    const map = new Map<string, (typeof evModels)[number]>();
    for (const m of evModels) map.set(`${m.marca} ${m.modelo}`, m);
    return map;
  }, [evModels]);
  const modelOptions = useMemo(
    () => filterModelLabels(evModelsByLabel.keys(), modelSearch),
    [evModelsByLabel, modelSearch]
  );

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const batteryHint = vehicle
    ? (() => {
        const pct = Math.max(0, Math.min(100, startBatteryPct || 0));
        const autonomyFullKm = vehicleAutonomyKm(vehicle);
        const rangeAtPct = autonomyFullKm * (pct / 100);
        return `${pct}% de batería · autonomía estimada ${rangeAtPct.toFixed(0)} km (${autonomyFullKm.toFixed(0)} km a batería llena para este vehículo)`;
      })()
    : "Elegí o creá un vehículo primero.";

  function prefill(
    name: string,
    capacityKwh: number,
    consumptionKwhKm: number,
    chargingPowerKw: number
  ) {
    setForm({
      name,
      capacity: String(capacityKwh),
      consumption: String(consumptionKwhKm),
      chargingPower: String(chargingPowerKw),
    });
  }

  function onModelSearchChange(v: string) {
    setModelSearch(v);
    const model = evModelsByLabel.get(v.trim());
    if (!model) return;
    prefill(
      `${model.marca} ${model.modelo}`,
      model.bateria_kwh,
      model.consumo_kwh_km,
      model.potencia_carga_kw
    );
    setModelPhoto(cloudinaryResize(model.foto_url, 100) ?? null);
  }

  async function searchVehicleAi() {
    const query = aiQuery.trim();
    if (!query || aiBusy) return;
    setAiBusy(true);
    setAiResult(null);
    try {
      const model = await lookupVehicleAi(query);
      prefill(
        `${model.marca} ${model.modelo}`,
        model.bateria_kwh,
        model.consumo_kwh_km,
        model.potencia_carga_kw
      );
      setModelSearch("");
      setAiResult({
        text: `Encontrado: ${model.marca} ${model.modelo} (autonomía aprox. ${Math.round(model.autonomia_aprox_km)} km). Revisá los campos antes de crear el vehículo.`,
        error: false,
      });
    } catch (err) {
      setAiResult({
        text: err instanceof Error ? err.message : "No se pudo consultar la IA.",
        error: true,
      });
    } finally {
      setAiBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateBusy(true);
    try {
      const vehicle = await createVehicle({
        name: form.name.trim(),
        battery_capacity_kwh: Number(form.capacity),
        consumption_kwh_per_km: Number(form.consumption),
        charging_power_kw: Number(form.chargingPower),
      });
      addVehicle(vehicle);
      setForm(emptyForm);
      setModelSearch("");
      setModelPhoto(null);
      setFormOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo crear el vehículo.");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Vehículo</h2>
      <div className="field">
        <label htmlFor="vehicle-select">Vehículo activo</label>
        <select
          id="vehicle-select"
          value={selectedVehicleId ?? ""}
          disabled={vehicles.length === 0}
          onChange={(e) => selectVehicle(Number(e.target.value))}
        >
          {vehicles.length === 0 ? (
            <option value="">
              {vehiclesLoaded ? "No hay vehículos: creá uno abajo" : "Cargando vehículos..."}
            </option>
          ) : (
            vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name.includes(`${v.battery_capacity_kwh} kWh`)
                  ? v.name
                  : `${v.name} (${v.battery_capacity_kwh} kWh)`}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="field">
        <label htmlFor="start-battery">Batería inicial (%)</label>
        <input
          id="start-battery"
          type="number"
          min={0}
          max={100}
          step={1}
          disabled={!vehicle}
          value={vehicle ? startBatteryPct : ""}
          onChange={(e) => setStartBatteryPct(readNumberInput(e))}
        />
        <div className="hint">{batteryHint}</div>
      </div>
      <button type="button" className="ghost small" onClick={() => setFormOpen((v) => !v)}>
        + Nuevo vehículo
      </button>

      {formOpen && (
        <form className="inline-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="v-model-search">Modelo (opcional, precarga los datos)</label>
            <input
              id="v-model-search"
              type="text"
              list="v-model-datalist"
              autoComplete="off"
              placeholder={`Escribí al menos ${MODEL_SEARCH_MIN_CHARS} letras (ej. Nissan Leaf, Tesla Model 3)...`}
              value={modelSearch}
              onChange={(e) => onModelSearchChange(e.target.value)}
            />
            <datalist id="v-model-datalist">
              {modelOptions.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
            {modelPhoto && <img src={modelPhoto} alt="" className={styles.photoPreview} />}
          </div>

          {aiEnabled && (
            <div className="field">
              <label htmlFor="v-ai-query">¿No está en la lista? Buscá cualquier auto</label>
              <div className="address-search-row">
                <input
                  id="v-ai-query"
                  type="text"
                  placeholder="ej. Fiat 500e, Tesla Model S Plaid"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchVehicleAi();
                    }
                  }}
                />
                <button
                  type="button"
                  className="ghost small"
                  disabled={aiBusy}
                  onClick={() => void searchVehicleAi()}
                >
                  {aiBusy ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {aiResult && (
                <div className="address-result">
                  <span className={aiResult.error ? "error" : ""}>{aiResult.text}</span>
                </div>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="v-name">Nombre</label>
            <input
              type="text"
              id="v-name"
              required
              placeholder="ej. Nissan Leaf"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="v-capacity">Capacidad de batería (kWh)</label>
            <input
              id="v-capacity"
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
            <label htmlFor="v-consumption">Consumo (kWh / km)</label>
            <input
              id="v-consumption"
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
            <label htmlFor="v-charging-power">Potencia de carga del vehículo (kW)</label>
            <input
              id="v-charging-power"
              type="number"
              step="any"
              min={0.5}
              required
              placeholder="22"
              value={form.chargingPower}
              onChange={(e) => setForm((f) => ({ ...f, chargingPower: e.target.value }))}
            />
          </div>
          {createError && <Banner variant="error">{createError}</Banner>}
          <button type="submit" className="primary small" disabled={createBusy}>
            {createBusy ? "Creando..." : "Crear vehículo"}
          </button>
        </form>
      )}
    </section>
  );
}
