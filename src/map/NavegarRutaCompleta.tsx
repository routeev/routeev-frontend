import { Fragment } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { esDispositivoApple, urlsRutaCompleta, type PuntoNav } from "./navegar";
import ui from "./panel.module.css";

/**
 * "Navegar la ruta completa": Google Maps con todo el recorrido (las paradas de carga como
 * waypoints) y Waze (o Mapas de Apple) hasta la primera parada, porque sus links aceptan un solo
 * destino. No reemplaza a "Iniciar viaje": abrir otra app saca a la persona de RouteEV, y el
 * seguimiento de la batería en vivo solo anda con esta pestaña abierta.
 */
export function NavegarRutaCompleta({
  origen,
  paradas,
  destino,
}: {
  origen: PuntoNav;
  paradas: readonly PuntoNav[];
  destino: PuntoNav;
}) {
  const { t } = useTranslation();
  const d = t.map.directions.fullRoute;
  const u = urlsRutaCompleta(origen, paradas, destino);
  const conParadas = paradas.length > 0;
  // Lo que abre cada app, en su nombre accesible: "Waze" a secas no dice que no es la ruta entera.
  const links: [string, string, string][] = [
    ...(u.google ? ([["Google Maps", u.google, d.scopeAll]] as [string, string, string][]) : []),
    ["Waze", u.waze, conParadas ? d.scopeFirstStop : d.scopeAll],
    ...(esDispositivoApple()
      ? ([[t.map.directions.appleMaps, u.apple, conParadas ? d.scopeFirstStop : d.scopeAll]] as [string, string, string][])
      : []),
  ];
  return (
    <div>
      <p>
        <strong>{d.label}</strong>:{" "}
        {links.map(([app, href, alcance], i) => (
          <Fragment key={app}>
            {i > 0 && " · "}
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={d.aria(app, alcance)}>
              {app}
            </a>
          </Fragment>
        ))}
      </p>
      <p className={ui.muted}>{u.google == null ? d.tooMany : conParadas ? d.noteWithStops : d.noteNoStops}</p>
    </div>
  );
}
