import { useMemo } from "react";
import type { ShowroomModel, SimulateResult } from "../api/showroom";
import { useTranslation } from "../i18n/LanguageProvider";
import { formatDuration, formatUyu } from "../shared/format";
import { num } from "./num";
import { SimulationMap } from "./SimulationMap";
import { armarTramos } from "./simulationTimeline";
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
  const { t } = useTranslation();
  const sr = t.showroom.simulationResult;
  const tramosInfo = useMemo(() => armarTramos(resultado), [resultado]);
  const tieneMapa = resultado.detalle.tramos.every((t) => Array.isArray(t.route_coords) && t.route_coords.length > 1);

  if (!resultado.llega) {
    return (
      <div className={styles.out}>
        <p className={[styles.veredicto, styles.no].join(" ")}>{sr.noLlega}</p>
        <p className={styles.detalle}>{sr.noLlegaDetalle(bateria)}</p>
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

      {/* Acá vivía el perfil batería-vs-distancia (<CertaintyLine
          scale="macro">). Se retiró a pedido: con los nombres reales de las
          paradas las etiquetas del eje se pisaban unas a otras y la
          animación del mapa de arriba ya cuenta la misma historia (la
          batería bajando tramo a tramo) mejor. La versión "micro" del
          historial (/profile) sigue viva -- ahí no dibuja etiquetas. */}
      <p className={[styles.veredicto, styles.si].join(" ")}>{sr.llega}</p>
      <p className={styles.detalle}>{sr.llegaDetalle(desde, hasta, bateria, d.tramos.length > 1)}</p>

      {/* Semáforo del margen: crítico < 5% siempre; "bajo" hasta el margen que
          el plan intentó mantener (el backend ya sumó las recargas que pudo). */}
      {resultado.bateria_llegada_pct < 5 ? (
        <p className={[styles.margenAviso, styles.margenCritico].join(" ")}>
          {sr.margenCritico(num(resultado.bateria_llegada_pct, 1))}
        </p>
      ) : resultado.bateria_llegada_pct < margenPct ? (
        <p className={[styles.margenAviso, styles.margenBajo].join(" ")}>
          {sr.margenBajo(num(resultado.bateria_llegada_pct, 1), num(margenPct), resultado.margen_alcanzado === false)}
        </p>
      ) : (
        <p className={[styles.margenAviso, styles.margenOk].join(" ")}>
          {sr.margenOk(num(resultado.bateria_llegada_pct, 1), num(margenPct))}
        </p>
      )}

      <dl className={styles.cifras}>
        <div>
          <dt>{sr.dtDistancia}</dt>
          <dd className="mono-num">{num(d.distancia_km, 1)} km</dd>
        </div>
        <div>
          <dt>{sr.dtTiempoTotal}</dt>
          <dd className="mono-num">{formatDuration(resultado.tiempo_total_min)}</dd>
        </div>
        <div>
          <dt>{sr.dtBateriaLlegada}</dt>
          <dd className={["mono-num", styles.bat].join(" ")}>{num(resultado.bateria_llegada_pct, 1)}%</dd>
        </div>
        <div>
          <dt>{sr.dtCostoViaje}</dt>
          <dd className={["mono-num", styles.costo].join(" ")}>{formatUyu(resultado.costo_uyu)}</dd>
        </div>
      </dl>

      <div className={styles.desglose}>
        <div>
          <h5>{sr.tiempoTitulo}</h5>
          <ul>
            <li>
              <span>{sr.manejando}</span>
              <span className="mono-num">{formatDuration(d.conduccion_min)}</span>
            </li>
            <li>
              <span>{sr.demorasTrafico}</span>
              <span className="mono-num">{formatDuration(d.trafico_min)}</span>
            </li>
            <li>
              <span>{sr.enchufadoCargando}</span>
              <span className="mono-num">{formatDuration(d.recarga_min)}</span>
            </li>
          </ul>
        </div>
        <div>
          <h5>{sr.plataTitulo}</h5>
          <ul>
            <li>
              <span>{conTarifas ? sr.energiaCasa(num(kwhCasa, 1)) : sr.energiaTotal(num(d.energia_kwh, 1))}</span>
              <span className="mono-num">{formatUyu(d.costo_uyu_energia)}</span>
            </li>
            {conTarifas && paradas.length > 0 && (
              <li>
                <span>{sr.recargasEnRuta(paradas.length)}</span>
                <span className="mono-num">{formatUyu(d.costo_uyu_recargas ?? 0)}</span>
              </li>
            )}
            {sinTarifa > 0 && <li className={styles.desgloseNota}>{sr.recargasSinTarifa(sinTarifa)}</li>}
            <li>
              <span>
                {sr.peajes}
                {d.peajes ? ` (${d.peajes})` : ""}
              </span>
              <span className="mono-num">{formatUyu(d.peaje_uyu)}</span>
            </li>
            <li className={styles.desgloseTotal}>
              <span>{sr.total}</span>
              <span className="mono-num">{formatUyu(resultado.costo_uyu)}</span>
            </li>
          </ul>
        </div>
      </div>

      {d.tramos.length > 1 && (
        <ul className={styles.tramos}>
          {d.tramos.map((tramo) => (
            <li key={tramo.tramo}>
              <span className={styles.tramoNombre}>{tramo.tramo === "ida" ? sr.ida : sr.vuelta}</span>
              <span className="mono-num">{num(tramo.distancia_km, 1)} km</span>
              <span className="mono-num">{formatDuration(tramo.conduccion_min + tramo.trafico_min + tramo.recarga_min)}</span>
              <span className="mono-num">{formatUyu(tramo.costo_uyu_total)}</span>
            </li>
          ))}
        </ul>
      )}

      {paradas.length ? (
        <>
          <h5 className={styles.paradasTitulo}>{sr.paradasTitulo}</h5>
          <ol className={styles.paradas}>
            {paradas.map((parada, i) => {
              const datos = [sr.enchufado(formatDuration(parada.minutos)), sr.kwhGanados(num(parada.kwh, 1))];
              if (parada.potencia_efectiva_kw) {
                datos.push(
                  parada.potencia_efectiva_kw < parada.potencia_kw
                    ? sr.potenciaLimitada(num(parada.potencia_efectiva_kw), num(parada.potencia_kw))
                    : sr.potenciaSimple(num(parada.potencia_kw))
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
                  {parada.tarifa && (
                    <p className={styles.paradaTarifa}>{tarifaLinea(parada.tarifa, t.showroom.tarifaTexto)}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className={styles.sinParadas}>{sr.sinParadas}</p>
      )}
    </div>
  );
}
