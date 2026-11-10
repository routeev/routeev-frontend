import { Fragment } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { esDispositivoApple, urlsParaNavegar } from "./navegar";

/**
 * "Waze · Google Maps", con el mismo formato que los links de la app de pago
 * en la ficha de la estación. Cada link dice adónde lleva en su nombre
 * accesible: en una lista de paradas, cinco "Waze" iguales no dicen nada.
 */
export function ComoLlegar({ lat, lon, nombre }: { lat: number; lon: number; nombre: string }) {
  const { t } = useTranslation();
  const d = t.map.directions;
  const u = urlsParaNavegar(lat, lon);
  const links: [string, string][] = [
    ["Waze", u.waze],
    ["Google Maps", u.google],
    ...(esDispositivoApple() ? ([[d.appleMaps, u.apple]] as [string, string][]) : []),
  ];
  return (
    <span>
      {links.map(([app, href], i) => (
        <Fragment key={app}>
          {i > 0 && " · "}
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={d.aria(app, nombre)}>
            {app}
          </a>
        </Fragment>
      ))}
    </span>
  );
}
