import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getUsername } from "../api/session";
import { getMe, nombreParaMostrar } from "../api/user";
import { listVehicles } from "../api/vehicles";
import { useTranslation } from "../i18n/LanguageProvider";
import { LandingHeader } from "../landing/LandingHeader";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { AccountSection } from "./AccountSection";
import { CarsSection } from "./CarsSection";
import { IconSectionAccount, IconSectionCars, IconSectionTrips } from "./profileIcons";
import { TripsSection } from "./TripsSection";
import styles from "./ProfilePage.module.css";

const SECTIONS = ["autos", "viajes", "cuenta"] as const;
type SectionId = (typeof SECTIONS)[number];

/** La sección que se está leyendo, para marcarla en el índice. */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("autos");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    // La franja de lectura: debajo del header y en la mitad de arriba.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = SECTIONS.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-90px 0px -55% 0px" }
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

/**
 * El perfil, en una sola página: Mis autos → Viajes y gasto → Mi cuenta →
 * Eliminar cuenta. En escritorio, a la izquierda la identidad y un índice que
 * acompaña el scroll; en el celular el índice es un segmentado de anclas
 * (#autos, #viajes, #cuenta).
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const p = t.profile;
  const [searchParams, setSearchParams] = useSearchParams();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const active = useActiveSection();
  const [addOnLoad] = useState(() => searchParams.get("agregar-vehiculo") === "1");

  const username = me.data?.username ?? getUsername() ?? "";
  const name = nombreParaMostrar(me.data ?? { username }) || t.nav.fallbackUsername;
  const photo = me.data?.photo_url;

  const sections: { id: SectionId; label: string; Icon: typeof IconSectionCars; count?: number }[] =
    [
      { id: "autos", label: p.sections.cars, Icon: IconSectionCars, count: vehicles.data?.length },
      { id: "viajes", label: p.sections.trips, Icon: IconSectionTrips },
      { id: "cuenta", label: p.sections.account, Icon: IconSectionAccount },
    ];

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{`RouteEV · ${t.nav.myProfile}`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <LandingHeader loggedIn page="profile" />

      <div className={styles.shell}>
        <aside className={styles.aside}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {photo ? (
                <img src={cloudinaryResize(photo, 160) ?? photo} alt="" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </span>
            <div className={styles.identityText}>
              <h1 className={styles.name}>{name}</h1>
              {username && <span className={styles.username}>@{username}</span>}
            </div>
          </div>
          <nav aria-label={p.sections.label} className={styles.sectionNav}>
            {sections.map(({ id, label, Icon, count }) => (
              <Link
                key={id}
                to={{ hash: id }}
                replace
                className={styles.sectionLink}
                aria-current={active === id ? "true" : undefined}
              >
                <Icon />
                <span className={styles.sectionLabel}>{label}</span>
                {count != null && <span className={styles.sectionCount}>{count}</span>}
              </Link>
            ))}
          </nav>
        </aside>

        <main className={styles.main}>
          <CarsSection
            addOnLoad={addOnLoad}
            onAddClosed={() => {
              if (!searchParams.has("agregar-vehiculo")) return;
              setSearchParams(
                (prev) => {
                  prev.delete("agregar-vehiculo");
                  return prev;
                },
                { replace: true, preventScrollReset: true }
              );
            }}
          />
          <TripsSection />
          <AccountSection />
        </main>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© {new Date().getFullYear()} RouteEV</span>
          <nav aria-label={p.footer.label} className={styles.footerNav}>
            <Link to="/privacidad">{p.footer.privacy}</Link>
            <Link to="/terminos">{p.footer.terms}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
