import { useTranslation } from "../i18n/LanguageProvider";
import { Banner } from "../shared/Banner";
import { RouteAutocompleteField } from "./RouteAutocompleteField";
import { useGeolocation } from "./useGeolocation";
import { useMapStore } from "./mapStore";
import type { TripStep } from "./nextStep";
import styles from "./RouteInputPanel.module.css";

interface RouteInputPanelProps {
  banner: { message: string; variant: "error" | "warn" } | null;
  /** Único paso pendiente, ya redactado (ver nextStep.ts). */
  step: TripStep;
}

export function RouteInputPanel({ banner, step }: RouteInputPanelProps) {
  const { t } = useTranslation();
  const ri = t.map.routeInput;
  const pickMode = useMapStore((s) => s.pickMode);
  const picking = useMapStore((s) => s.picking);
  const startPicking = useMapStore((s) => s.startPicking);
  const stopPicking = useMapStore((s) => s.stopPicking);
  const hasDestination = useMapStore((s) => s.destinationNode != null);
  const cargadorEnDestino = useMapStore((s) => s.cargadorEnDestino);
  const setCargadorEnDestino = useMapStore((s) => s.setCargadorEnDestino);
  const geolocation = useGeolocation();

  // El botón de chincheta alterna: si ya se está marcando ese rol, se cancela.
  // Sin esto no había forma de salir del modo más que fijando un punto.
  const togglePicking = (role: "origin" | "destination") =>
    picking === role ? stopPicking() : startPicking(role);

  const cargadorOpciones = [
    { id: "yes", label: ri.chargerAtDestination.yes, valor: true },
    { id: "no", label: ri.chargerAtDestination.no, valor: false },
  ];

  return (
    <section className="panel">
      <h2>{ri.title}</h2>

      <div className={styles.routeInput}>
        <RouteAutocompleteField
          role="origin"
          placeholder={ri.originPlaceholder}
          isPicking={picking === "origin"}
          isNextTarget={picking == null && pickMode === "origin"}
          onPickTarget={() => togglePicking("origin")}
        />
        <div className={styles.connector} aria-hidden="true" />
        <RouteAutocompleteField
          role="destination"
          placeholder={ri.destinationPlaceholder}
          isPicking={picking === "destination"}
          isNextTarget={picking == null && pickMode === "destination"}
          onPickTarget={() => togglePicking("destination")}
        />
      </div>

      {/* Un paso concreto y uno solo, no "tocá el mapa para fijar el punto
          activo, o escribí una calle, cruce o dirección" -- ese texto era
          siempre el mismo, describía el mecanismo en vez de decir qué falta, y
          desde que la barra de "Calcular ruta" solo aparece cuando ya se puede
          calcular (ver MapPage.tsx) es acá donde la persona tiene que
          enterarse de qué le queda por hacer. */}
      <p className={[styles.step, step.done ? styles.stepDone : ""].join(" ")}>
        <span className={styles.stepMark} aria-hidden="true">
          {step.done ? "✓" : "→"}
        </span>
        {step.text}
      </p>

      {hasDestination && (
        // Solo con destino puesto: antes de eso la pregunta no tiene sujeto
        // ("¿en el destino?" ¿cuál?) y sería una fila más ocupando pantalla sin
        // aportar, que es justo lo que se sacó del panel.
        <fieldset className={styles.cargador}>
          <legend className={styles.cargadorLegend}>{ri.chargerAtDestination.legend}</legend>
          <p className={styles.cargadorHint}>{ri.chargerAtDestination.hint}</p>
          <div className={styles.cargadorOpciones}>
            {cargadorOpciones.map((opcion) => (
              <label
                key={opcion.id}
                className={[styles.cargadorOpcion, cargadorEnDestino === opcion.valor ? styles.cargadorOpcionActiva : ""].join(" ")}
              >
                <input
                  type="radio"
                  name="cargador-en-destino"
                  checked={cargadorEnDestino === opcion.valor}
                  onChange={() => setCargadorEnDestino(opcion.valor)}
                />
                {opcion.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button type="button" className="ghost small full-width" onClick={geolocation.useMyLocation} disabled={geolocation.busy}>
        <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3.4M12 18.6V22M22 12h-3.4M5.4 12H2" />
          <circle cx="12" cy="12" r="7.4" />
        </svg>
        {geolocation.busy ? ri.locatingYou : ri.useMyLocation}
      </button>
      {geolocation.result && (
        <div className="address-result">
          <span className={geolocation.result.kind === "warn" ? "warn" : geolocation.result.kind === "error" ? "error" : ""}>
            {geolocation.result.text}
          </span>
        </div>
      )}

      {/* alert y no un status pasivo: este banner lleva el fallo de "Calcular
          ruta" y vive al fondo del panel, debajo del botón de ubicación y
          dentro de un contenedor con scroll. En un teléfono, quien aprieta el
          botón verde de abajo no ve aparecer nada: sin anuncio, la lectura es
          "no pasó nada" y se cierra la app. */}
      {banner && (
        <Banner variant={banner.variant} alert>
          {banner.message}
        </Banner>
      )}
    </section>
  );
}
