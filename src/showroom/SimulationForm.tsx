import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { showroomDestinos, showroomSimulate, type ShowroomModel } from "../api/showroom";
import { Banner } from "../shared/Banner";
import { readNumberInput } from "../shared/readNumberInput";
import { Spinner } from "../shared/Spinner";
import { toast } from "../shared/toastStore";
import { SimulationResult } from "./SimulationResult";
import styles from "./SimulationForm.module.css";

interface SimulationFormProps {
  model: ShowroomModel;
}

const BATERIA_MIN = 10;
const BATERIA_MAX = 100;

export function SimulationForm({ model }: SimulationFormProps) {
  const destinosQuery = useQuery({ queryKey: ["showroomDestinos"], queryFn: showroomDestinos });
  const destinos = destinosQuery.data ?? [];

  // Montevideo primero en la lista; un destino lejos por defecto -- el caso
  // interesante es el que obliga a parar a cargar, no la vuelta a la esquina.
  // `null` significa "sin elegir todavia": se usa el default calculado de
  // `destinos` en vez de sincronizarlo a estado propio con un efecto.
  const [origenOverride, setOrigenOverride] = useState<string | null>(null);
  const [destinoOverride, setDestinoOverride] = useState<string | null>(null);
  const [bateria, setBateria] = useState(100);
  const [idaYVuelta, setIdaYVuelta] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bateriaError, setBateriaError] = useState<string | null>(null);

  const defaultOrigenId = destinos[0]?.id ?? "";
  const defaultDestinoId = (destinos.find((d) => d.nombre === "Punta del Este") ?? destinos[destinos.length - 1])?.id ?? "";
  const origenId = origenOverride ?? defaultOrigenId;
  const destinoId = destinoOverride ?? defaultDestinoId;

  const simulate = useMutation({
    mutationFn: () =>
      showroomSimulate({
        origin_id: origenId,
        destination_id: destinoId,
        model_ids: [model.id],
        bateria_inicial_pct: Math.max(BATERIA_MIN, Math.min(BATERIA_MAX, bateria || BATERIA_MAX)),
        ida_y_vuelta: idaYVuelta,
      }),
    // El resultado se dibuja bastante más abajo (a veces fuera de la pantalla,
    // sobre todo en celular): sin este aviso, terminar de calcular no se
    // notaba desde donde había quedado el dedo.
    onSuccess: () => toast.ok("Listo, ya calculamos el viaje con este auto."),
  });

  if (destinosQuery.isSuccess && destinos.length === 0) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBateriaError(null);
    // QA MEDIO 19: esta validación la hacía el navegador por su cuenta (el
    // min/max/step del input) y la contestaba en inglés -- "Value must be
    // greater than or equal to 10" en el medio de una pantalla en castellano.
    // Con noValidate en el <form> el navegador ya no se mete y el mensaje lo
    // ponemos nosotros. Ojo: el step={5} del input SIGUE ahí a propósito, pero
    // ahora solo controla de a cuánto se mueven las flechitas; escribir 47 a
    // mano es perfectamente válido y antes lo rechazaba con otro cartel en
    // inglés ("The two nearest valid values are 45 and 50").
    if (!Number.isFinite(bateria) || bateria < BATERIA_MIN || bateria > BATERIA_MAX) {
      setBateriaError(`La batería al salir va de ${BATERIA_MIN} % a ${BATERIA_MAX} %.`);
      document.getElementById("sim-bat")?.focus();
      return;
    }
    if (origenId === destinoId) {
      setFormError("Elegí un destino distinto del origen.");
      return;
    }
    simulate.mutate();
  }

  const origenNombre = destinos.find((d) => d.id === origenId);
  const destinoNombre = destinos.find((d) => d.id === destinoId);

  return (
    <>
      <h3>¿Llego con este auto?</h3>
      <p>
        Se calcula el viaje real sobre el mapa vial del país con este auto, revisando la batería tramo a tramo
        y sumando paradas de carga si hacen falta.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <div className={styles.form}>
          <div className="field">
            <label htmlFor="sim-origen">Desde</label>
            <select id="sim-origen" value={origenId} onChange={(e) => setOrigenOverride(e.target.value)}>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.departamento})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sim-destino">Hasta</label>
            <select id="sim-destino" value={destinoId} onChange={(e) => setDestinoOverride(e.target.value)}>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.departamento})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sim-bat">Batería al salir (%)</label>
            <input
              type="number"
              id="sim-bat"
              min={BATERIA_MIN}
              max={BATERIA_MAX}
              step={5}
              value={bateria}
              aria-invalid={Boolean(bateriaError)}
              aria-describedby={bateriaError ? "sim-bat-error" : undefined}
              onChange={(e) => {
                setBateria(readNumberInput(e));
                setBateriaError(null);
              }}
            />
            {bateriaError && (
              <p className={styles.fieldError} id="sim-bat-error">
                {bateriaError}
              </p>
            )}
          </div>
        </div>

        <label className={["check-field", styles.checkField].join(" ")}>
          <input type="checkbox" checked={idaYVuelta} onChange={(e) => setIdaYVuelta(e.target.checked)} />
          <span>Ida y vuelta sin cargar en el destino</span>
        </label>

        {/* aria-busy además del disabled: el `disabled` evita el doble
            disparo pero no cuenta que hay algo en curso; el spinner lo cuenta
            pero solo a quien mira. Los dos juntos, más el texto, cubren todos
            los casos. */}
        <button type="submit" className="primary" disabled={simulate.isPending} aria-busy={simulate.isPending}>
          {simulate.isPending ? (
            <>
              <Spinner /> Calculando…
            </>
          ) : (
            "Calcular el viaje"
          )}
        </button>
      </form>

      {formError && (
        <div style={{ marginTop: 16 }}>
          <Banner variant="error" alert>
            {formError}
          </Banner>
        </div>
      )}

      {simulate.isError && (
        <div style={{ marginTop: 16 }}>
          <Banner variant="error" alert>
            {simulate.error instanceof Error ? simulate.error.message : "No se pudo calcular el viaje."}
          </Banner>
        </div>
      )}

      {simulate.isSuccess && origenNombre && destinoNombre && (
        <SimulationResult
          resultado={simulate.data.resultados[0]!}
          model={model}
          desde={`${origenNombre.nombre} (${origenNombre.departamento})`}
          hasta={`${destinoNombre.nombre} (${destinoNombre.departamento})`}
          bateria={Math.max(BATERIA_MIN, Math.min(BATERIA_MAX, bateria || BATERIA_MAX))}
          margenPct={simulate.data.margen_bateria_pct ?? 10}
        />
      )}
    </>
  );
}
