import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { getToken } from "../api/session";
import { useTranslation } from "../i18n/LanguageProvider";
import { LandingFooter } from "../landing/LandingFooter";
import { LandingHeader } from "../landing/LandingHeader";
import { IndexBody, IndexHero } from "./BrandIndex";
import { BrandPage } from "./BrandPage";
import { linePath, type Catalog, type CatalogBrand, type CatalogLine } from "./catalog";
import { CrumbBar, type Crumb } from "./CrumbBar";
import { makeFormat } from "./format";
import { ModelPage } from "./ModelPage";
import { SearchResults } from "./SearchResults";
import { CatalogError, CatalogLoading, NotFound } from "./ShowroomStates";
import { useShowroomCatalog } from "./useShowroomCatalog";
import { useShowroomSearch } from "./useShowroomSearch";
import styles from "./ShowroomPage.module.css";

const SITE = "https://routeev.uy";

/**
 * El showroom: /showroom (marcas), /showroom/<marca> (sus modelos) y
 * /showroom/<marca>/<modelo> (la ficha, con ?v= para la versión). Un solo
 * buscador sirve en cualquiera de las tres; mientras tiene texto, sus
 * resultados reemplazan al contenido de la vista.
 */
export function ShowroomPage() {
  const { t, lang } = useTranslation();
  const loggedIn = Boolean(getToken());
  const params = useParams();
  const brandSlug = params.marca?.toLowerCase();
  const lineSlug = params.linea?.toLowerCase();
  const [searchParams] = useSearchParams();
  const legacyId = searchParams.get("modelo");
  const { catalog, isError, refetch, addModel } = useShowroomCatalog();
  const [query, setQuery] = useShowroomSearch();
  const location = useLocation();
  const heroInputRef = useRef<HTMLInputElement>(null);

  // La lupa del celular (en marca y ficha) trae acá con el buscador listo para escribir.
  const focusSearch = (location.state as { focusSearch?: boolean } | null)?.focusSearch === true;
  useEffect(() => {
    if (focusSearch && catalog) heroInputRef.current?.focus();
  }, [focusSearch, catalog, location.key]);

  // Links viejos (/showroom?modelo=<id>, los que ya están compartidos y en
  // Google): a la ficha nueva con esa versión elegida.
  if (legacyId && catalog) {
    const line = catalog.lineByModelId.get(legacyId);
    return (
      <Navigate
        replace
        to={line ? `${linePath(line)}?v=${encodeURIComponent(legacyId)}` : "/showroom"}
      />
    );
  }

  const view = !brandSlug ? "index" : !lineSlug ? "brand" : "model";
  const brand = catalog && brandSlug ? catalog.brandBySlug.get(brandSlug) : undefined;
  const line = brand && lineSlug ? catalog?.lineByPath.get(`${brand.slug}/${lineSlug}`) : undefined;
  const searching = query.trim().length > 0;

  let content;
  if (!catalog) {
    content = isError ? <CatalogError onRetry={() => void refetch()} /> : <CatalogLoading />;
  } else {
    const crumbs: Crumb[] = [{ label: "Showroom", to: "/showroom" }];
    if (brand) crumbs.push({ label: brand.name, to: `/showroom/${brand.slug}` });
    if (line) crumbs.push({ label: line.name, to: linePath(line) });

    content = (
      <>
        {view === "index" ? (
          <IndexHero
            catalog={catalog}
            query={query}
            onQueryChange={setQuery}
            inputRef={heroInputRef}
          />
        ) : (
          <CrumbBar crumbs={crumbs} query={query} onQueryChange={setQuery} />
        )}
        {searching ? (
          <SearchResults
            catalog={catalog}
            query={query}
            headingLevel={view === "index" ? 2 : 1}
            onAddModel={addModel}
          />
        ) : view === "index" ? (
          <IndexBody catalog={catalog} />
        ) : view === "brand" ? (
          brand ? (
            <BrandPage catalog={catalog} brand={brand} />
          ) : (
            <NotFound title={t.showroom.brand.notFoundTitle} body={t.showroom.brand.notFoundBody} />
          )
        ) : line ? (
          // key: otra ficha arranca de cero (versión, simulación).
          <ModelPage key={linePath(line)} line={line} loggedIn={loggedIn} />
        ) : (
          <NotFound title={t.showroom.model.notFoundTitle} body={t.showroom.model.notFoundBody} />
        )}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <ShowroomMeta
        catalog={catalog}
        view={view}
        brand={brand}
        line={line}
        query={searching ? query.trim() : ""}
        lang={lang}
      />
      <LandingHeader loggedIn={loggedIn} page="showroom" />
      <main id="contenido" className={styles.main}>
        {content}
      </main>
      <LandingFooter page="showroom" note={t.showroom.footerNote} />
    </div>
  );
}

interface ShowroomMetaProps {
  catalog: Catalog | null;
  view: "index" | "brand" | "model";
  brand: CatalogBrand | undefined;
  line: CatalogLine | undefined;
  query: string;
  lang: "es" | "en";
}

/**
 * Un solo <Helmet> para toda la página: react-helmet-async no reemplaza un
 * <meta> de un Helmet de afuera por el de uno más adentro con el mismo
 * nombre, los deja convivir. Por eso cada vista arma el suyo completo acá.
 */
function ShowroomMeta({ catalog, view, brand, line, query, lang }: ShowroomMetaProps) {
  const { t } = useTranslation();
  const tm = t.showroom.meta;
  const f = makeFormat(lang);

  let title = tm.indexTitle;
  let description = tm.indexDescription;
  let ogTitle = tm.ogTitle;
  let path = "/showroom";
  let noindex = false;

  if (catalog && view === "brand") {
    if (brand) {
      title = tm.brandTitle(brand.name);
      description = tm.brandDescription(brand.name, brand.lines.length);
      ogTitle = title;
      path = `/showroom/${brand.slug}`;
    } else {
      title = tm.notFoundTitle;
      noindex = true;
    }
  } else if (catalog && view === "model") {
    if (line) {
      const name = `${line.brand} ${line.name}`;
      const km = f.n(line.main.autonomia_aprox_km);
      title = tm.modelTitle(name);
      description = tm.modelDescription(name, km, f.n(line.main.bateria_kwh, 1));
      ogTitle = tm.modelOgTitle(name, km);
      // Sin ?v=: todas las versiones son la misma página para Google.
      path = linePath(line);
    } else {
      title = tm.notFoundTitle;
      noindex = true;
    }
  }
  if (query) {
    title = tm.searchTitle(query);
    noindex = true;
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex" />}
      <link rel="canonical" href={`${SITE}${path}`} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={lang === "es" ? "es_UY" : "en_US"} />
      <meta property="og:site_name" content="RouteEV" />
      <meta property="og:url" content={`${SITE}${path}`} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${SITE}/img/og-cover.png`} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
