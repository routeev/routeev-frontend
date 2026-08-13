import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { showroomModel, type ShowroomModel } from "../api/showroom";
import { CarSilhouette } from "../shared/CarSilhouette";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { formatDuration, formatUyu } from "../shared/format";
import { groupFamilies, versionLabel } from "./modelFamily";
import { num } from "./num";
import { SimulationForm } from "./SimulationForm";
import { useModelPhoto } from "./useModelPhoto";
import styles from "./ModelFicha.module.css";

interface ModelFichaProps {
  modelId: string;
  onClose: () => void;
  /** Todas las versiones de la familia de este modelo (incluida esta). */
  versiones?: ShowroomModel[];
  onSelectVersion?: (id: string) => void;
}

export function ModelFicha({ modelId, onClose, versiones, onSelectVersion }: ModelFichaProps) {
  // La familia se rearma acá solo para el nombre limpio y las etiquetas de
  // versión ("48 kWh", "GT"); las versiones ya vienen agrupadas del catálogo.
  const familia = useMemo(
    () => (versiones && versiones.length > 1 ? groupFamilies(versiones)[0] : null),
    [versiones]
  );
  const query = useQuery({
    queryKey: ["showroomModel", modelId],
    queryFn: () => showroomModel(modelId),
  });
  const model = query.data?.model;
  // useModelPhoto se llama siempre, antes de cualquier return condicional
  // (reglas de hooks) -- con nombre vacio mientras no hay datos, el propio
  // hook no dispara ningun pedido (ver el guard `!nombre` ahi adentro).
  const { ref, photo } = useModelPhoto(
    model ? `${model.marca} ${model.modelo}` : "",
    true,
    model?.foto_url ? { url: model.foto_url, credito: model.foto_credito } : undefined
  );

  if (query.isLoading) {
    return (
      <section className={styles.ficha} aria-label="Ficha del modelo elegido">
        <p className={styles.cargando}>Cargando ficha…</p>
      </section>
    );
  }

  if (query.isError || !query.data || !model) {
    return (
      <section className={styles.ficha} aria-label="Ficha del modelo elegido">
        <p className="error-banner">
          {query.error instanceof Error
            ? query.error.message
            : "No se pudo cargar la ficha de este modelo."}
        </p>
      </section>
    );
  }

  const { metricas } = query.data;
  const nombre = `${model.marca} ${model.modelo}`;
  const hayLimite = metricas.carga.some((f) => f.potencia_efectiva_kw < f.potencia_kw);

  // Tarifario de la red (pliego UTE): opcional porque el backend viejo en
  // producción no lo manda. Sin él, la ficha sigue cotizando todo "a precio
  // de casa" como siempre y no se aclara nada.
  const tarifasRed = metricas.tarifas_red;
  const hayCosto = metricas.carga.some((f) => f.costo_uyu != null);
  // DC y AC por separado: el backend puede publicar una sola modalidad.
  const preciosRed = tarifasRed
    ? [
        tarifasRed.dc &&
          `DC $ ${num(tarifasRed.dc.energia_uyu_kwh, 2)}/kWh + ${formatUyu(tarifasRed.dc.cargo_base_uyu)} de conexión`,
        tarifasRed.ac && `AC $ ${num(tarifasRed.ac.energia_uyu_kwh, 2)}/kWh + ${formatUyu(tarifasRed.ac.cargo_base_uyu)}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section className={styles.ficha} aria-label="Ficha del modelo elegido" tabIndex={-1}>
      <button
        type="button"
        className={styles.cerrar}
        aria-label="Cerrar la ficha"
        onClick={onClose}
      >
        &times;
      </button>

      <div className={styles.foto} ref={ref}>
        {!(photo?.encontrada && photo.url) && (
          <CarSilhouette name={nombre} className={styles.silueta} />
        )}
        {photo?.encontrada && photo.url && (
          <img className={styles.fotoImg} src={cloudinaryResize(photo.url, 800)} alt="" />
        )}
        <p className={styles.credito}>
          {photo?.encontrada ? (
            <>
              Foto: Wikimedia Commons
              {photo.credito?.autor ? ` · ${photo.credito.autor}` : ""}
              {photo.credito?.licencia ? ` · ${photo.credito.licencia}` : ""}
              {photo.credito?.archivo_url && (
                <>
                  {" · "}
                  <a href={photo.credito.archivo_url} target="_blank" rel="noopener noreferrer">
                    ver original
                  </a>
                </>
              )}
            </>
          ) : (
            "Sin foto libre de este modelo."
          )}
        </p>
      </div>

      <div>
        <p className={["eyebrow", styles.marca].join(" ")}>{model.marca}</p>
        <h2 className={styles.modelo}>{model.modelo}</h2>

        {familia && (
          <div className={styles.versiones} role="group" aria-label="Versiones de este modelo">
            <p className={styles.versionesTitulo}>Este auto viene en {familia.versiones.length} versiones — elegí la tuya:</p>
            <div className={styles.versionesLista}>
              {familia.versiones.map((v) => {
                const etiqueta = versionLabel(familia, v) || `${num(v.bateria_kwh, 1)} kWh`;
                const activa = v.id === model.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={[styles.version, activa ? styles.versionActiva : ""].join(" ")}
                    aria-pressed={activa}
                    onClick={() => {
                      if (!activa) onSelectVersion?.(v.id);
                    }}
                  >
                    <span className={styles.versionNombre}>{etiqueta}</span>
                    <span className={["mono-num", styles.versionDatos].join(" ")}>
                      {num(v.bateria_kwh, 1)} kWh · {num(v.autonomia_aprox_km)} km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {model.nota && (
          <p className={[styles.nota, model.fuente === "ia" ? styles.notaIa : ""].join(" ")}>
            {model.nota}
          </p>
        )}

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Batería</dt>
            <dd className="mono-num">
              {num(model.bateria_kwh, 1)}
              <small> kWh</small>
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>Autonomía real</dt>
            <dd className="mono-num">
              {num(metricas.autonomia_calculada_km)}
              <small> km</small>
            </dd>
            <p className={styles.statSub}>Fabricante: {num(model.autonomia_aprox_km)} km</p>
          </div>
          <div className={styles.stat}>
            <dt>Consumo</dt>
            <dd className="mono-num">
              {num(metricas.consumo_kwh_100km, 1)}
              <small> kWh/100 km</small>
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>Carga máxima</dt>
            <dd className="mono-num">
              {num(model.potencia_carga_kw)}
              <small> kW</small>
            </dd>
          </div>
          <div className={[styles.stat, styles.statCosto].join(" ")}>
            <dt>Costo cada 100 km</dt>
            <dd className="mono-num">{formatUyu(metricas.costo_uyu_100km)}</dd>
            {/* Con tarifario de red a la vista hay que aclarar que estos dos
                costos son al precio de casa, no al de las estaciones. */}
            <p className={styles.statSub}>
              A $ {num(metricas.energia_uyu_kwh, 2)} el kWh{tarifasRed ? ", cargando en casa" : ""}
            </p>
          </div>
          <div className={[styles.stat, styles.statCosto].join(" ")}>
            <dt>Cargar la batería entera</dt>
            <dd className="mono-num">{formatUyu(metricas.costo_carga_completa_uyu)}</dd>
            <p className={styles.statSub}>
              {num(model.bateria_kwh, 1)} kWh de punta a punta{tarifasRed ? ", en casa" : ""}
            </p>
          </div>
        </dl>

        <div className={styles.bloque}>
          <h3>
            Cargar del {metricas.carga_desde_pct}% al {metricas.carga_hasta_pct}%
            <small>+{num(metricas.carga_km_recuperados)} km de autonomía</small>
          </h3>
          <p className={styles.bloqueSub}>
            En las potencias que existen de verdad en la red uruguaya, sobre las{" "}
            {num(metricas.estaciones_red)} estaciones de UTE del mapa. La potencia baja sola cerca
            del 80%: por eso el tramo final tarda tanto y conviene seguir viaje.
          </p>
          <table className={styles.carga}>
            <thead>
              <tr>
                <th>Estación</th>
                <th>Le entrega</th>
                <th>Tarda</th>
                {/* Solo si alguna fila trae costo (backend nuevo): sin datos,
                    la tabla queda exactamente como estaba. */}
                {hayCosto && <th>Cuesta</th>}
              </tr>
            </thead>
            <tbody>
              {metricas.carga.map((fila, i) => (
                <tr key={i}>
                  <td className="mono-num">
                    {num(fila.potencia_kw)} kW <small>· {num(fila.estaciones)} estaciones</small>
                  </td>
                  <td
                    className={[
                      "mono-num",
                      fila.potencia_efectiva_kw < fila.potencia_kw ? styles.limitado : "",
                    ].join(" ")}
                  >
                    {num(fila.potencia_efectiva_kw)} kW
                  </td>
                  <td className="mono-num">{formatDuration(fila.minutos)}</td>
                  {hayCosto && (
                    <td className="mono-num">{fila.costo_uyu != null ? formatUyu(fila.costo_uyu) : "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {hayLimite && (
            <p className={styles.notaCarga}>
              Este auto acepta hasta {num(model.potencia_carga_kw)} kW: en una estación más potente
              carga igual de rápido que en una de {num(model.potencia_carga_kw)} kW, no más.
            </p>
          )}
          {tarifasRed && (
            <p className={styles.notaTarifas}>
              Precios de red según pliego {tarifasRed.operador ?? "UTE"} {tarifasRed.vigencia}
              {preciosRed ? `: ${preciosRed}` : ""}. En casa: $ {num(tarifasRed.casa_uyu_kwh, 2)}/kWh.
            </p>
          )}
        </div>

        <div className={styles.bloque}>
          <SimulationForm model={model} />
        </div>
      </div>
    </section>
  );
}
