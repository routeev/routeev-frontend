import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { authConfig } from "../api/auth";
import type { ShowroomFicha } from "../api/showroom";
import { useTranslation } from "../i18n/LanguageProvider";
import buttons from "../shared/buttons.module.css";
import { SiteFooter } from "../shared/SiteFooter";
import { SiteHeader } from "../shared/SiteHeader";
import { ModelFicha } from "./ModelFicha";
import { ModelGrid } from "./ModelGrid";
import { num } from "./num";
import { SearchControls } from "./SearchControls";
import styles from "./ShowroomPage.module.css";
import { useShowroomCatalog } from "./useShowroomCatalog";

export function ShowroomPage() {
  const { t, lang } = useTranslation();
  const sp = t.showroom.page;
  const catalog = useShowroomCatalog();
  const { addModel } = catalog;
  // staleTime: Infinity -- ver el mismo comentario en GoogleSignIn.tsx.
  const { data: cfg } = useQuery({ queryKey: ["authConfig"], queryFn: authConfig, retry: false, staleTime: Infinity });
  const [searchParams, setSearchParams] = useSearchParams();
  const fichaId = searchParams.get("modelo");
  const fichaRef = useRef<HTMLDivElement | null>(null);

  // useCallback: referencia estable para que el React.memo de ModelGrid
  // (solucion.md 2.11) no se invalide en cada render por esto.
  const selectModel = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("modelo", id);
        return next;
      });
    },
    [setSearchParams]
  );

  const closeFicha = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("modelo");
      return next;
    });
  }, [setSearchParams]);

  // useCallback: misma razon que selectModel/closeFicha arriba. Se
  // desestructura addModel (en vez de usar catalog.addModel) porque `catalog`
  // es un objeto nuevo en cada render -- exhaustive-deps no puede saber que
  // esa propiedad puntual ya es estable si el objeto entero no lo es.
  const onAiModelFound = useCallback(
    (ficha: ShowroomFicha) => {
      addModel(ficha.model);
      selectModel(ficha.model.id);
    },
    [addModel, selectModel]
  );

  useEffect(() => {
    if (fichaId) fichaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [fichaId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && fichaId) closeFicha();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichaId]);

  return (
    <div>
      {/* Solo sin ficha abierta: react-helmet-async NO reemplaza un <meta>/
          <link> de un Helmet ancestro por el de uno más adentro con el
          mismo name/property -- los deja a los dos convivir (title es la
          única excepción, ahí sí gana el último). Con ficha abierta,
          ModelFicha pone su PROPIO Helmet completo (título, descripción,
          canonical Y los og:type/locale/site_name/image de acá abajo) en
          vez de heredar estos; de ahí que este bloque entero se apague. */}
      {!fichaId && (
        <Helmet>
          <title>{sp.metaTitle}</title>
          <meta name="description" content={sp.metaDescription} />
          <link rel="canonical" href="https://routeev.uy/showroom" />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content={lang === "es" ? "es_UY" : "en_US"} />
          <meta property="og:site_name" content="RouteEV" />
          <meta property="og:url" content="https://routeev.uy/showroom" />
          <meta property="og:title" content={sp.ogTitle} />
          <meta property="og:description" content={sp.ogDescription} />
          <meta property="og:image" content="https://routeev.uy/img/og-cover.png" />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
      )}

      <SiteHeader navLinks={[{ href: "/", label: sp.navHome }, { href: "/showroom", label: sp.navShowroom }]}>
        <Link to="/login" className={buttons.navLink}>
          {sp.login}
        </Link>
        <Link to="/login?crear=1" className={buttons.primary}>
          {sp.createAccount}
        </Link>
      </SiteHeader>

      <main className={styles.main}>
        <section className={styles.head}>
          <p className="eyebrow">{sp.eyebrow}</p>
          <h1>
            {sp.headlineLine1}
            <br />
            {sp.headlineLine2}
          </h1>
          <p className={styles.sub}>
            <strong className="mono-num">{num(catalog.total)}</strong> {sp.subtitle}
          </p>

          <SearchControls
            query={catalog.query}
            onQueryChange={catalog.setQuery}
            marca={catalog.marca}
            onMarcaChange={catalog.setMarca}
            marcas={catalog.marcas}
            orden={catalog.orden}
            onOrdenChange={catalog.setOrden}
            soloDc={catalog.soloDc}
            onSoloDcChange={catalog.setSoloDc}
            count={catalog.familias.length}
          />
        </section>

        {fichaId && (
          <div ref={fichaRef}>
            <ModelFicha
              modelId={fichaId}
              onClose={closeFicha}
              // La familia completa (sin filtros de búsqueda): la ficha
              // siempre ofrece TODAS las versiones de este auto.
              versiones={catalog.familiaPorId.get(fichaId)?.versiones}
              onSelectVersion={selectModel}
            />
          </div>
        )}

        <section className={styles.results}>
          <ModelGrid
            isLoading={catalog.isLoading}
            isError={catalog.isError}
            errorMessage={catalog.error instanceof Error ? catalog.error.message : undefined}
            onRetry={() => void catalog.refetch()}
            familias={catalog.visible}
            hasResults={catalog.familias.length > 0}
            hasMore={catalog.hayMas}
            onLoadMore={catalog.verMas}
            onSelectModel={selectModel}
            query={catalog.query}
            hasActiveFilters={Boolean(catalog.marca || catalog.soloDc)}
            aiEnabled={Boolean(cfg?.ai_vehicle_lookup_enabled)}
            onAiModelFound={onAiModelFound}
          />
        </section>
      </main>

      <SiteFooter note={sp.footerNote} />
    </div>
  );
}
