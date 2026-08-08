import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  navLinks?: { href: string; label: string }[];
  children?: ReactNode;
}

/** Nav sticky compartido por landing y las páginas legales (css/landing.css .l-nav). */
export function SiteHeader({ navLinks, children }: SiteHeaderProps) {
  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <Brand />
        {navLinks && navLinks.length > 0 && (
          <nav className={styles.links}>
            {navLinks.map((link) =>
              link.href.startsWith("#") ? (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} to={link.href}>
                  {link.label}
                </Link>
              )
            )}
          </nav>
        )}
        <div className={styles.cta}>{children}</div>
      </div>
    </header>
  );
}
