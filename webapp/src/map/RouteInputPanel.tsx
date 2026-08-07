import { Banner } from "../shared/Banner";
import { RouteAutocompleteField } from "./RouteAutocompleteField";
import { useGeolocation } from "./useGeolocation";
import { useMapStore } from "./mapStore";
import styles from "./RouteInputPanel.module.css";

interface RouteInputPanelProps {
  routeError: string | null;
}

export function RouteInputPanel({ routeError }: RouteInputPanelProps) {
  const pickMode = useMapStore((s) => s.pickMode);
  const setPickMode = useMapStore((s) => s.setPickMode);
  const geolocation = useGeolocation();

  return (
    <section className="panel">
      <h2>Tu viaje</h2>

      <div className={styles.routeInput}>
        <RouteAutocompleteField
          role="origin"
          placeholder="¿Desde dónde salís?"
          isPickTarget={pickMode === "origin"}
          onPickTarget={() => setPickMode("origin")}
        />
        <div className={styles.connector} aria-hidden="true" />
        <RouteAutocompleteField
          role="destination"
          placeholder="¿A dónde vas?"
          isPickTarget={pickMode === "destination"}
          onPickTarget={() => setPickMode("destination")}
        />
      </div>

      <p className="hint">Tocá el mapa para fijar el punto activo, o escribí una calle, cruce o dirección.</p>

      <button type="button" className="ghost small full-width" onClick={geolocation.useMyLocation} disabled={geolocation.busy}>
        <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3.4M12 18.6V22M22 12h-3.4M5.4 12H2" />
          <circle cx="12" cy="12" r="7.4" />
        </svg>
        {geolocation.busy ? "Buscando tu ubicación..." : "Usar mi ubicación como origen"}
      </button>
      {geolocation.result && (
        <div className="address-result">
          <span className={geolocation.result.kind === "warn" ? "warn" : geolocation.result.kind === "error" ? "error" : ""}>
            {geolocation.result.text}
          </span>
        </div>
      )}

      {routeError && <Banner variant="error">{routeError}</Banner>}
    </section>
  );
}
