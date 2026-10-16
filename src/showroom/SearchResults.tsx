import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { authConfig } from "../api/auth";
import { ApiError } from "../api/client";
import { showroomLookupAi, type ShowroomFicha, type ShowroomModel } from "../api/showroom";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconArrowRight } from "../landing/landingIcons";
import { brandHref, linePath, searchCatalog, type Catalog } from "./catalog";
import { useFormat } from "./format";
import { LineList } from "./LineList";
import { IconSpark } from "./showroomIcons";
import styles from "./SearchResults.module.css";
import ui from "./ui.module.css";

interface SearchResultsProps {
  catalog: Catalog;
  query: string;
  /** En el índice el h1 es el de la cabecera; en marca y ficha, este. */
  headingLevel: 1 | 2;
  onAddModel: (model: ShowroomModel) => void;
}

/** Mientras hay texto en el buscador, esto reemplaza al contenido de la vista. */
export function SearchResults({ catalog, query, headingLevel, onAddModel }: SearchResultsProps) {
  const { t } = useTranslation();
  const ts = t.showroom.search;
  const queryClient = useQueryClient();
  const trimmed = query.trim();
  const { brands, lines } = searchCatalog(catalog, trimmed);
  const Heading = headingLevel === 1 ? "h1" : "h2";

  // staleTime: Infinity -- ver el mismo comentario en GoogleSignIn.tsx.
  const { data: cfg } = useQuery({
    queryKey: ["authConfig"],
    queryFn: authConfig,
    retry: false,
    staleTime: Infinity,
  });
  const ai = useMutation({
    mutationFn: (consulta: string) => showroomLookupAi(consulta),
    onSuccess: (ficha: ShowroomFicha) => {
      // La ficha ya vino entera: la página del auto no la vuelve a pedir.
      queryClient.setQueryData(["showroomModel", ficha.model.id], ficha);
      onAddModel({ ...ficha.model, fuente: "ia" });
    },
  });
  // El estado de la IA es de la búsqueda que lo pidió, no de la que está escrita ahora.
  const aiHere = ai.variables === trimmed;
  const aiLine = aiHere && ai.data ? catalog.lineByModelId.get(ai.data.model.id) : undefined;
  const aiLineListed = aiLine && lines.includes(aiLine);

  const noHits = lines.length === 0 && brands.length === 0;
  const offerAi = Boolean(cfg?.ai_vehicle_lookup_enabled) && trimmed.length >= 2;

  return (
    <section aria-labelledby="h-res" className={styles.results}>
      <div className={styles.head}>
        <Heading id="h-res" className={styles.title}>
          {ts.title(trimmed)}
        </Heading>
        <span className={styles.count} aria-live="polite">
          {ts.count(lines.length)}
        </span>
      </div>

      {!noHits && (
        <>
          {brands.length > 0 && (
            <div className={styles.brandHits}>
              {brands.map((brand) => {
                const only = brand.lines.length === 1 ? brand.lines[0] : undefined;
                return (
                  <Link key={brand.slug} to={brandHref(brand)} className={styles.brandHit}>
                    <span className={styles.brandHitName}>
                      <span className={styles.brandHitLabel}>{ts.brandLabel}</span>
                      <span className={styles.brandHitTitle}>{brand.name}</span>
                    </span>
                    <span className={styles.brandHitSub}>
                      {only ? only.name : ts.brandModels(brand.lines.length)}
                    </span>
                    <span className={styles.brandHitCta}>
                      {ts.seeBrand}
                      <IconArrowRight size={16} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {aiLineListed && (
            <p role="status" className={styles.aiNote}>
              <IconSpark size={14} />
              {ts.aiDone}
            </p>
          )}

          {lines.length > 0 && (
            <div className={styles.list}>
              <LineList lines={lines} showBrand />
            </div>
          )}
        </>
      )}

      {noHits && (
        <div className={styles.none}>
          <div className={styles.noneText}>
            <p className={styles.noneTitle}>{ts.noResultsTitle(trimmed)}</p>
            <p className={styles.noneBody}>{ts.noResultsBody}</p>
            <Link to="/showroom" className={styles.browse}>
              {ts.browse}
              <IconArrowRight size={16} />
            </Link>
          </div>

          {offerAi && (
            <div className={styles.ai}>
              <span className={styles.aiTitle}>
                <span className={styles.aiIcon}>
                  <IconSpark size={18} />
                </span>
                {ts.aiTitle}
              </span>
              <p className={styles.aiBody}>{ts.aiBody}</p>
              {aiHere && ai.isPending ? (
                <span role="status" className={styles.aiBusy}>
                  <span className={ui.spinner} />
                  {ts.aiBusy}
                </span>
              ) : aiLine ? (
                <AiFound model={aiLine.main} href={linePath(aiLine)} />
              ) : (
                <button type="button" className={ui.btnPrimary} onClick={() => ai.mutate(trimmed)}>
                  {ts.aiButton(trimmed)}
                </button>
              )}
              {aiHere && ai.isError && (
                <p role="alert" className={styles.aiError}>
                  {ai.error instanceof ApiError && ai.error.status === 429
                    ? ts.aiRateLimited
                    : ts.aiError}
                </p>
              )}
              <span className={styles.aiLimit}>{ts.aiLimit}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AiFound({ model, href }: { model: ShowroomModel; href: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <>
      <Link to={href} className={styles.aiFound}>
        <span className={styles.aiFoundMain}>
          <span className={styles.aiFoundName}>
            {model.marca} {model.linea || model.modelo}
            <span className={[ui.pill, ui.pillSmall].join(" ")}>{t.showroom.card.ai}</span>
          </span>
          <span className={styles.aiFoundSpec}>
            {f.n(model.bateria_kwh, 1)} kWh · {f.n(model.potencia_carga_kw)} kW
          </span>
        </span>
        <span className={styles.aiFoundKm}>
          {f.n(model.autonomia_aprox_km)}
          <span className={ui.unit}>km</span>
        </span>
      </Link>
      <span role="status" className={styles.aiDone}>
        {t.showroom.search.aiDone}
      </span>
    </>
  );
}
