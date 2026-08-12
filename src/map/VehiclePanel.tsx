import { Link } from "react-router-dom";
import buttons from "../shared/buttons.module.css";
import { readNumberInput } from "../shared/readNumberInput";
import { useMapStore, vehicleAutonomyKm } from "./mapStore";

export function VehiclePanel() {
  const vehicles = useMapStore((s) => s.vehicles);
  const vehiclesLoaded = useMapStore((s) => s.vehiclesLoaded);
  const selectedVehicleId = useMapStore((s) => s.selectedVehicleId);
  const selectVehicle = useMapStore((s) => s.selectVehicle);
  const startBatteryPct = useMapStore((s) => s.startBatteryPct);
  const setStartBatteryPct = useMapStore((s) => s.setStartBatteryPct);

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const batteryHint = vehicle
    ? (() => {
        const pct = Math.max(0, Math.min(100, startBatteryPct || 0));
        const autonomyFullKm = vehicleAutonomyKm(vehicle);
        const rangeAtPct = autonomyFullKm * (pct / 100);
        return `${pct}% de batería · autonomía estimada ${rangeAtPct.toFixed(0)} km (${autonomyFullKm.toFixed(0)} km a batería llena para este vehículo)`;
      })()
    : "Elegí o creá un vehículo primero.";

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
      <Link to="/profile" className={buttons.ghost}>
        + Agregar nuevo vehículo
      </Link>
    </section>
  );
}
