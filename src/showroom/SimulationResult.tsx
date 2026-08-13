import { useMemo } from "react";
import type { ShowroomModel, SimulateResult } from "../api/showroom";
import { CertaintyLine } from "../shared/CertaintyLine";
import { formatDuration, formatUyu } from "../shared/format";
import { certaintyPointsFromSegments } from "./certaintyProfile";
import { num } from "./num";
import { SimulationMap } from "./SimulationMap";
import { armarSegmentos, armarTramos } from "./simulationTimeline";
import { tarifaLinea } from "./tarifaTexto";
import styles from "./SimulationResult.module.css";

interface SimulationResultProps {
  resultado: SimulateResult;
  model: ShowroomModel;
  desde: string;
  hasta: string;
  bateria: number;
  /** Margen de seguridad (% de batería) que el plan intenta mantener como piso. */
  margenPct?: number;
}

export function SimulationResult({ resultado, model, desde, hasta, bateria, margenPct = 10 }: SimulationResultProps) {
  const tramosInfo = useMemo(() => armarTramos(resultado), [resultado]);
  const tieneMapa = resultado.detalle.tramos.every((t) => Array.isArray(t.route_coords) && t.route_coords.length > 1);
  const certaintyPoints = useMemo(() => {
    if (!tieneMapa) return [];
    const { segments } = armarSegmentos(tramosInfo, (model.bateria_kwh * bateria) / 100);
    return certaintyPointsFromSegments(segments, model.bateria_kwh, desde, hasta);
  }, [tieneMapa, tramosInfo, model.bateria_kwh, bateria, desde, hasta]);

  if (!resultado.llega) {
    return (
      <div className={styles.out}>
        <p className={[styles.veredicto, styles.no].join(" ")}>No llega</p>
        <p className={styles.detalle}>
          Saliendo con {bateria}% de batería no hay ningún camino que este auto pueda hacer hasta ahí, ni parando
          a cargar en las estaciones que hay en el trayecto.
        </p>
      </div>
    );
  }

  const d = resultado.detalle;
  const paradas = resultado.paradas ?? [];

  // Backend nuevo: costo_uyu_recargas presente significa que costo_uyu_energia
  // es SOLO la energía de casa y cada recarga en ruta viene cotizada con el
  // tarifario de su operador. Backend viejo en producción: nada de esto llega
  // y el desglose queda como siempre.
  const conTarifas = d.costo_uyu_recargas != null;
  // El detalle no trae los kWh de casa por separado: se derivan restando lo
  // recargado en ruta (suma de las paradas) del total consumido.
  const kwhCasa = Math.max(0, d.energia_kwh - paradas.reduce((acc, p) => acc + p.kwh, 0));
  const sinTarifa = d.recargas_sin_tarifa ?? 0;

  return (
    <div className={styles.out}>
      {tieneMapa && (
        <div className={styles.anim}>
          <SimulationMap
            tramosInfo={tramosInfo}
            capacidadKwh={model.bateria_kwh}
            bateriaInicialPct={bateria}
            tiempoTotalMin={resultado.tiempo_total_min}
          />
        </div>
      )}

      {certaintyPoints.length >= 2 && (
        <div className={styles.profile}>
          <CertaintyLine points={certaintyPoints} scale="macro" />
        </div>
      )}

      <p className={[styles.veredicto, styles.si].join(" ")}>Llega</p>
      <p className={styles.detalle}>
        {desde} → {hasta}, saliendo con {bateria}% de batería
        {d.tramos.length > 1 ? ", ida y vuelta." : "."}
      </p>

      {/* Semáforo del margen: crítico < 5% siempre; "bajo" hasta el margen que
          el plan intentó mantener (el backend ya sumó las recargas que pudo). */}
      {resultado.bateria_llegada_pct < 5 ? (
        <p className={[styles.margenAviso, styles.margenCritico].join(" ")}>
          🔴 Margen crítico: llega con apenas {num(resultado.bateria_llegada_pct, 1)}% de batería. Cualquier desvío o
          consumo extra puede dejarlo sin carga antes de llegar.
        </p>
      ) : resultado.bateria_llegada_pct < margenPct ? (
        <p className={[styles.margenAviso, styles.margenBajo].join(" ")}>
          🟠 Margen bajo: llega con {num(resultado.bateria_llegada_pct, 1)}%, por debajo del margen de seguridad del{" "}
          {num(margenPct)}%{resultado.margen_alcanzado === false ? " — no hay plan de cargas que lo respete en este viaje" : ""}.
        </p>
      ) : (
        <p className={[styles.margenAviso, styles.margenOk].join(" ")}>
          🟢 Llega con {num(resultado.bateria_llegada_pct, 1)}% de batería, dentro del margen de seguridad ({num(margenPct)}%).
        </p>
      )}

      <dl className={styles.cifras}>
        <div>
          <dt>Distancia</dt>
          <dd className="mono-num">{num(d.distancia_km, 1)} km</dd>
        </div>
        <div>
          <dt>Tiempo total</dt>
          <dd className="mono-num">{formatDuration(resultado.tiempo_total_min)}</dd>
        </div>
        <div>
          <dt>Batería al llegar</dt>
          <dd className={["mono-num", styles.bat].join(" ")}>{num(resultado.bateria_llegada_pct, 1)}%</dd>
        </div>
        <div>
          <dt>Costo del viaje</dt>
          <dd className={["mono-num", styles.costo].join(" ")}>{formatUyu(resultado.costo_uyu)}</dd>
        </div>
      </dl>

      <div className={styles.desglose}>
        <div>
          <h5>El tiempo</h5>
          <ul>
            <li>
              <span>Manejando</span>
              <span className="mono-num">{formatDuration(d.conduccion_min)}</span>
            </li>
            <li>
              <span>Demoras por tráfico</span>
              <span className="mono-num">{formatDuration(d.trafico_min)}</span>
            </li>
            <li>
              <span>Enchufado cargando</span>
              <span className="mono-num">{formatDuration(d.recarga_min)}</span>
            </li>
          </ul>
        </div>
        <div>
          <h5>La plata</h5>
          <ul>
            <li>
              <span>{conTarifas ? `Energía de casa (${num(kwhCasa, 1)} kWh)` : `Energía (${num(d.energia_kwh, 1)} kWh)`}</span>
              <span className="mono-num">{formatUyu(d.costo_uyu_energia)}</span>
            </li>
            {conTarifas && paradas.length > 0 && (
              <li>
                <span>Recargas en ruta ({paradas.length})</span>
                <span className="mono-num">{formatUyu(d.costo_uyu_recargas ?? 0)}</span>
              </li>
            )}
            {sinTarifa > 0 && (
              <li className={styles.desgloseNota}>
                + {sinTarifa} recarga{sinTarifa === 1 ? "" : "s"} en operador sin tarifario publicado — no{" "}
                {sinTarifa === 1 ? "incluida" : "incluidas"} en el total
              </li>
            )}
            <li>
              <span>Peajes{d.peajes ? ` (${d.peajes})` : ""}</span>
              <span className="mono-num">{formatUyu(d.peaje_uyu)}</span>
            </li>
            <li className={styles.desgloseTotal}>
              <span>Total</span>
              <span className="mono-num">{formatUyu(resultado.costo_uyu)}</span>
            </li>
          </ul>
        </div>
      </div>

      {d.tramos.length > 1 && (
        <ul className={styles.tramos}>
          {d.tramos.map((t) => (
            <li key={t.tramo}>
              <span className={styles.tramoNombre}>{t.tramo === "ida" ? "Ida" : "Vuelta"}</span>
              <span className="mono-num">{num(t.distancia_km, 1)} km</span>
              <span className="mono-num">{formatDuration(t.conduccion_min + t.trafico_min + t.recarga_min)}</span>
              <span className="mono-num">{formatUyu(t.costo_uyu_total)}</span>
            </li>
          ))}
        </ul>
      )}

      {paradas.length ? (
        <>
          <h5 className={styles.paradasTitulo}>Dónde para a cargar</h5>
          <ol className={styles.paradas}>
            {paradas.map((parada, i) => {
              const datos = [`${formatDuration(parada.minutos)} enchufado`, `+${num(parada.kwh, 1)} kWh`];
              if (parada.potencia_efectiva_kw) {
                datos.push(
                  parada.potencia_efectiva_kw < parada.potencia_kw
                    ? `${num(parada.potencia_efectiva_kw)} kW (la estación da ${num(parada.potencia_kw)})`
                    : `${num(parada.potencia_kw)} kW`
                );
              }
              if (parada.conector) datos.push(parada.conector);
              if (parada.costo_uyu != null) datos.push(formatUyu(parada.costo_uyu));

              return (
                <li key={i}>
                  <div className={styles.paradaHead}>
                    <span className={styles.paradaNombre}>{parada.nombre}</span>
                    {d.tramos.length > 1 && <span className={styles.paradaTramo}>{parada.tramo}</span>}
                  </div>
                  <p className={styles.paradaDir}>{[parada.direccion, parada.operador].filter(Boolean).join(" · ")}</p>
                  <p className={["mono-num", styles.paradaDatos].join(" ")}>{datos.join(" · ")}</p>
                  {/* De dónde sale el costo de arriba (o por qué no hay costo).
                      Sin `tarifa` (backend viejo) no se muestra nada. */}
                  {parada.tarifa && <p className={styles.paradaTarifa}>{tarifaLinea(parada.tarifa)}</p>}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className={styles.sinParadas}>Llega de una, sin parar a cargar en el camino.</p>
      )}
    </div>
  );
}
