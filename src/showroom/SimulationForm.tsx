import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { showroomDestinos, showroomSimulate, type ShowroomModel } from "../api/showroom";
import { Banner } from "../shared/Banner";
import { readNumberInput } from "../shared/readNumberInput";
import { SimulationResult } from "./SimulationResult";
import styles from "./SimulationForm.module.css";

interface SimulationFormProps {
  model: ShowroomModel;
}

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
        bateria_inicial_pct: Math.max(10, Math.min(100, bateria || 100)),
        ida_y_vuelta: idaYVuelta,
      }),
  });

  if (destinosQuery.isSuccess && destinos.length === 0) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
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

      <form onSubmit={onSubmit}>
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
            <label htmlFor="sim-bat">Batería al salir</label>
            <input
              type="number"
              id="sim-bat"
              min={10}
              max={100}
              step={5}
              value={bateria}
              onChange={(e) => setBateria(readNumberInput(e))}
            />
          </div>
        </div>

        <label className={["check-field", styles.checkField].join(" ")}>
          <input type="checkbox" checked={idaYVuelta} onChange={(e) => setIdaYVuelta(e.target.checked)} />
          <span>Ida y vuelta sin cargar en el destino</span>
        </label>

        <button type="submit" className="primary" disabled={simulate.isPending}>
          {simulate.isPending ? "Calculando…" : "Calcular el viaje"}
        </button>
      </form>

      {formError && (
        <div style={{ marginTop: 16 }}>
          <Banner variant="error">{formError}</Banner>
        </div>
      )}

      {simulate.isError && (
        <div style={{ marginTop: 16 }}>
          <Banner variant="error">
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
          bateria={Math.max(10, Math.min(100, bateria || 100))}
        />
      )}
    </>
  );
}
