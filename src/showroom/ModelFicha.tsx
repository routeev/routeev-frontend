import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { showroomModel, type ShowroomModel } from "../api/showroom";
import { CarSilhouette } from "../shared/CarSilhouette";
import { useTranslation } from "../i18n/LanguageProvider";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { formatDuration, formatUyu } from "../shared/format";
import { modelAliases } from "./modelAlias";
import { groupFamilies, versionLabel } from "./modelFamily";
import { num } from "./num";
import { SimulationForm } from "./SimulationForm";
import { FichaSkeleton } from "./Skeletons";
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
  const { t, lang } = useTranslation();
  const mf = t.showroom.modelFicha;
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
      <section className={styles.ficha} aria-label={mf.ariaLabel} aria-busy="true">
        <p className="sr-only" role="status">
          {mf.loadingStatus}
        </p>
        <FichaSkeleton />
      </section>
    );
  }

  if (query.isError || !query.data || !model) {
    return (
      <section className={styles.ficha} aria-label={mf.ariaLabel}>
        <p className="error-banner">{query.error instanceof Error ? query.error.message : mf.loadError}</p>
      </section>
    );
  }

  const { metricas } = query.data;
  const nombre = `${model.marca} ${model.modelo}`;
  // Función común, no un hook: puede calcularse acá abajo, después de los
  // returns tempranos de arriba, sin violar las reglas de hooks.
  const alias = modelAliases(model);
  const hayLimite = metricas.carga.some((f) => f.potencia_efectiva_kw < f.potencia_kw);

  // Tarifario de la red (pliego UTE): opcional porque el backend viejo en
  // producción no lo manda. Sin él, la ficha sigue cotizando todo "a precio
  // de casa" como siempre y no se aclara nada.
  const tarifasRed = metricas.tarifas_red;
  const hayCosto = metricas.carga.some((f) => f.costo_uyu != null);
  // DC y AC por separado: el backend puede publicar una sola modalidad.
  const preciosRed = tarifasRed
    ? [
        tarifasRed.dc && mf.precioRedDc(num(tarifasRed.dc.energia_uyu_kwh, 2), formatUyu(tarifasRed.dc.cargo_base_uyu)),
        tarifasRed.ac && `AC $ ${num(tarifasRed.ac.energia_uyu_kwh, 2)}/kWh + ${formatUyu(tarifasRed.ac.cargo_base_uyu)}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const autonomiaKm = num(metricas.autonomia_calculada_km);
  const bateriaKwh = num(model.bateria_kwh, 1);
  const canonicalUrl = `https://routeev.uy/showroom?modelo=${encodeURIComponent(modelId)}`;

  return (
    <section className={styles.ficha} aria-label={mf.ariaLabel} tabIndex={-1}>
      {/* Título/descripción propios de ESTE modelo, no los genéricos de
          ShowroomPage (que se apaga por completo mientras hay una ficha
          abierta, ver ShowroomPage.tsx): react-helmet-async NO reemplaza
          los <meta>/<link> de un Helmet ancestro por los de uno más
          adentro con el mismo name/property, los dos quedarían
          conviviendo -- por eso este Helmet repite también los og: que no
          cambian (type/locale/site_name/image) en vez de heredarlos. Sin
          nada de esto, cualquier resultado de Google para una ficha
          puntual mostraba el mismo título genérico de todo el showroom. */}
      <Helmet>
        <title>{mf.metaTitle(nombre)}</title>
        <meta name="description" content={mf.metaDescription(nombre, autonomiaKm, bateriaKwh)} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={lang === "es" ? "es_UY" : "en_US"} />
        <meta property="og:site_name" content="RouteEV" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={mf.ogTitle(nombre, autonomiaKm)} />
        <meta property="og:description" content={mf.metaDescription(nombre, autonomiaKm, bateriaKwh)} />
        <meta property="og:image" content="https://routeev.uy/img/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <button type="button" className={styles.cerrar} aria-label={mf.closeAriaLabel} onClick={onClose}>
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
              {mf.photoCredit}
              {photo.credito?.autor ? ` · ${photo.credito.autor}` : ""}
              {photo.credito?.licencia ? ` · ${photo.credito.licencia}` : ""}
              {photo.credito?.archivo_url && (
                <>
                  {" · "}
                  <a href={photo.credito.archivo_url} target="_blank" rel="noopener noreferrer">
                    {mf.viewOriginal}
                  </a>
                </>
              )}
            </>
          ) : (
            mf.noFreePhoto
          )}
        </p>
      </div>

      <div>
        <p className={["eyebrow", styles.marca].join(" ")}>{model.marca}</p>
        <h2 className={styles.modelo}>{model.modelo}</h2>
        {/* Los nombres locales de este auto, si el backend los manda: acá se
            listan todos (a diferencia de la tarjeta, que muestra uno solo por
            falta de lugar) porque es la pantalla donde se confirma que el auto
            encontrado es efectivamente el que se estaba buscando. */}
        {alias.length > 0 && <p className={styles.alias}>{mf.aliasTexto(alias)}</p>}

        {familia && (
          <div className={styles.versiones} role="group" aria-label={mf.versionsAriaLabel}>
            <p className={styles.versionesTitulo}>{mf.versionesTitulo(familia.versiones.length)}</p>
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
            <dt>{mf.statBateria}</dt>
            <dd className="mono-num">
              {num(model.bateria_kwh, 1)}
              <small> kWh</small>
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>{mf.statAutonomiaReal}</dt>
            <dd className="mono-num">
              {num(metricas.autonomia_calculada_km)}
              <small> km</small>
            </dd>
            {model.autonomia_homologada_km ? (
              // La cifra del fabricante, y SOLO cuando existe. Antes esta línea
              // mostraba `autonomia_aprox_km`, que es la autonomía real —
              // repetía el mismo número dos veces, uno de ellos rotulado como
              // si viniera del fabricante. Un tester lo cazó de una: "ni el
              // chino ni el real". Donde no hay homologación distinta, no hay
              // nada que contrastar y la línea no va.
              <p className={styles.statSub}>{mf.statFabricante(num(model.autonomia_homologada_km))}</p>
            ) : null}
          </div>
          <div className={styles.stat}>
            <dt>{mf.statConsumo}</dt>
            <dd className="mono-num">
              {num(metricas.consumo_kwh_100km, 1)}
              <small> kWh/100 km</small>
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>{mf.statCargaMaxima}</dt>
            <dd className="mono-num">
              {num(model.potencia_carga_kw)}
              <small> kW</small>
            </dd>
          </div>
          <div className={[styles.stat, styles.statCosto].join(" ")}>
            <dt>{mf.statCostoCada100}</dt>
            <dd className="mono-num">{formatUyu(metricas.costo_uyu_100km)}</dd>
            {/* Con tarifario de red a la vista hay que aclarar que estos dos
                costos son al precio de casa, no al de las estaciones. */}
            <p className={styles.statSub}>{mf.statCostoPorKwh(num(metricas.energia_uyu_kwh, 2), Boolean(tarifasRed))}</p>
          </div>
          <div className={[styles.stat, styles.statCosto].join(" ")}>
            <dt>{mf.statCargarCompleta}</dt>
            <dd className="mono-num">{formatUyu(metricas.costo_carga_completa_uyu)}</dd>
            <p className={styles.statSub}>{mf.statBateriaPuntaAPunta(num(model.bateria_kwh, 1), Boolean(tarifasRed))}</p>
          </div>
        </dl>

        <div className={styles.bloque}>
          <h3>
            {mf.cargarTitulo(metricas.carga_desde_pct, metricas.carga_hasta_pct)}
            <small>{mf.cargarKmRecuperados(num(metricas.carga_km_recuperados))}</small>
          </h3>
          <p className={styles.bloqueSub}>{mf.bloqueSub(num(metricas.estaciones_red))}</p>
          <table className={styles.carga}>
            <thead>
              <tr>
                <th>{mf.thEstacion}</th>
                <th>{mf.thEntrega}</th>
                <th>{mf.thTarda}</th>
                {/* Solo si alguna fila trae costo (backend nuevo): sin datos,
                    la tabla queda exactamente como estaba. */}
                {hayCosto && <th>{mf.thCuesta}</th>}
              </tr>
            </thead>
            <tbody>
              {metricas.carga.map((fila, i) => (
                <tr key={i}>
                  <td className="mono-num">
                    {num(fila.potencia_kw)} kW <small>{mf.stationsCount(num(fila.estaciones))}</small>
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
          {hayLimite && <p className={styles.notaCarga}>{mf.notaCarga(num(model.potencia_carga_kw))}</p>}
          {tarifasRed && (
            <p className={styles.notaTarifas}>
              {mf.notaTarifas(
                tarifasRed.operador ?? "UTE",
                tarifasRed.vigencia,
                preciosRed ? `: ${preciosRed}` : "",
                num(tarifasRed.casa_uyu_kwh, 2)
              )}
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
