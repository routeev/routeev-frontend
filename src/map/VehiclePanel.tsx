import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageProvider";
import buttons from "../shared/buttons.module.css";
import { IconCar } from "../shared/NavIcons";
import { readNumberInput } from "../shared/readNumberInput";
import { useMapStore, vehicleAutonomyKm } from "./mapStore";

export function VehiclePanel() {
  const { t } = useTranslation();
  const vp = t.map.vehiclePanel;
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
        return vp.batteryHint(pct, rangeAtPct.toFixed(0), autonomyFullKm.toFixed(0));
      })()
    : vp.chooseVehicleFirst;

  return (
    <section className="panel">
      <h2>{vp.title}</h2>
      <div className="field">
        <label htmlFor="vehicle-select">{vp.activeVehicle}</label>
        <select
          id="vehicle-select"
          value={selectedVehicleId ?? ""}
          disabled={vehicles.length === 0}
          onChange={(e) => selectVehicle(Number(e.target.value))}
        >
          {vehicles.length === 0 ? (
            <option value="">
              {vehiclesLoaded ? vp.noVehicles : vp.loadingVehicles}
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
        <label htmlFor="start-battery">{vp.startBattery}</label>
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
      {/* Icono de auto, no el "+" de texto que tenia antes -- pedido
          explicito de un logo/icono. El verbo "Agregar" ya dice que es alta,
          el "+" al lado del icono era redundante. IconCar ya trae su propio
          stroke=currentColor/tamaño (ver NavIcons.tsx), no hace falta
          .btn-icon encima.
          ?agregar-vehiculo=1: VehiclesPanel.tsx (en /profile) lo lee al
          montar para abrir el formulario de alta solo -- pedido explicito de
          que este link no solo lleve a /profile, sino que deje lista la
          pantalla para cargar el vehiculo de una, sin un segundo click en
          "+ Agregar vehiculo" al llegar. */}
      <Link to="/profile?agregar-vehiculo=1" className={buttons.ghost}>
        <IconCar />
        {vp.addVehicle}
      </Link>
    </section>
  );
}
