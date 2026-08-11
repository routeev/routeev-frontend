import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { getMe } from "../api/user";
import { AppTopbar } from "../shared/AppTopbar";
import buttons from "../shared/buttons.module.css";
import { IconMapPin } from "../shared/NavIcons";
import { AccountPanel } from "./AccountPanel";
import { HistoryPanel } from "./HistoryPanel";
import { MonthlyStatsPanel, VehicleStatsPanel } from "./StatsPanels";
import { VehiclesPanel } from "./VehiclesPanel";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  // Comparte queryKey con AccountPanel: es la misma request cacheada, solo
  // para que el chip de la barra muestre el nombre real de la cuenta.
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });

  return (
    <div className={styles.page}>
      <Helmet>
        <title>RouteEV · Mi perfil</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <AppTopbar subtitle="Mi perfil" username={meQuery.data?.username}>
        <Link to="/app" className={buttons.navLink}>
          <IconMapPin />
          Volver al mapa
        </Link>
      </AppTopbar>

      <main className={styles.main}>
        <AccountPanel />
        <VehiclesPanel />
        <MonthlyStatsPanel />
        <VehicleStatsPanel />
        <HistoryPanel />
      </main>
    </div>
  );
}
