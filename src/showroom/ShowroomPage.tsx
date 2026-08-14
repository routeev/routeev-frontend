import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { authConfig } from "../api/auth";
import type { ShowroomFicha } from "../api/showroom";
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
  const catalog = useShowroomCatalog();
  const { addModel } = catalog;
  const { data: cfg } = useQuery({ queryKey: ["authConfig"], queryFn: authConfig, retry: false });
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
      <Helmet>
        <title>Showroom eléctrico — RouteEV</title>
        <meta
          name="description"
          content="Buscá cualquier auto eléctrico y mirá sus datos reales: batería, autonomía, consumo, costo en pesos y tiempo de carga en la red de carga de Uruguay."
        />
        <link rel="canonical" href="https://routeev.uy/showroom" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_UY" />
        <meta property="og:site_name" content="RouteEV" />
        <meta property="og:url" content="https://routeev.uy/showroom" />
        <meta property="og:title" content="Showroom: 630 autos eléctricos con sus números reales" />
        <meta
          property="og:description"
          content="Batería, autonomía, consumo, costo cada 100 km en pesos y tiempo de carga en la red de carga. Sin crear cuenta."
        />
        <meta property="og:image" content="https://routeev.uy/img/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <SiteHeader navLinks={[{ href: "/", label: "Inicio" }, { href: "/showroom", label: "Showroom" }]}>
        <Link to="/login" className={buttons.navLink}>
          Iniciar sesión
        </Link>
        <Link to="/login?crear=1" className={buttons.primary}>
          Crear cuenta
        </Link>
      </SiteHeader>

      <main className={styles.main}>
        <section className={styles.head}>
          <p className="eyebrow">Showroom eléctrico</p>
          <h1>
            Buscá cualquier auto eléctrico
            <br />y mirá sus números de verdad.
          </h1>
          <p className={styles.sub}>
            <strong className="mono-num">{num(catalog.total)}</strong> modelos con sus datos de fábrica, el
            costo real en pesos y cuánto tarda en cargar en las estaciones que existen en Uruguay. La foto de
            cada auto se busca por su nombre. Sin cuenta, sin instalar nada.
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

      <SiteFooter note="RouteEV — Uruguay. Datos de catálogo aproximados de fabricante; fotos de Wikimedia Commons." />
    </div>
  );
}
