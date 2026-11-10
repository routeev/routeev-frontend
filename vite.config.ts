import react from "@vitejs/plugin-react";
// defineConfig sale de "vitest/config" y ya no de "vite": es el mismo helper
// con la clave `test` tipada, y reemplaza al `/// <reference types="vitest/config" />`
// que habia arriba (con un import del mismo modulo, la directiva triple-slash
// pasa a ser redundante y eslint la marca).
import type { Plugin } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

// Las pantallas públicas a las que se llega directo, con el módulo de su chunk
// (los mismos import() de src/lazyPages.tsx). /app y /profile quedan afuera:
// sin sesión redirigen al login, y precargar el mapa ahí sería bajar de más.
const RUTAS_PRECARGADAS: Record<string, string> = {
  "/": "src/landing/LandingPage.tsx",
  "/showroom": "src/showroom/ShowroomPage.tsx",
  "/login": "src/auth/LoginPage.tsx",
};

// Las dos fuentes del primer pantallazo (ver src/styles/fonts.css).
const FUENTES_PRECARGADAS = /^assets\/(inter|space-grotesk)-latin-wght-normal-[\w-]+\.woff2$/;

/**
 * Adelanta lo que el navegador iba a descubrir tarde, solo en el build:
 *
 * - Los chunks de la página que se está abriendo. Cada pantalla es un
 *   import() (lazyPages.tsx), así que sus archivos recién se pedían cuando el
 *   chunk de entrada terminaba de bajar y ejecutarse. Un script chico en el
 *   <head> mira la ruta y agrega los modulepreload de esa pantalla, que bajan
 *   a la par de la entrada. Va por script y no por <link> fijos porque el
 *   index.html es uno solo para todas las rutas.
 * - Las fuentes del primer pantallazo, que si no esperan a que llegue el CSS.
 *
 * Los nombres llevan hash, por eso se arman acá con el bundle ya generado.
 */
function preloadPlugin(): Plugin {
  return {
    name: "routeev-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const outputs = Object.values(bundle);
        const chunks = new Map(
          outputs.flatMap((o) => (o.type === "chunk" ? [[o.fileName, o] as const] : []))
        );

        // El chunk de la pantalla y todo lo que importa de forma estática,
        // con su CSS; lo que index.html ya trae (la entrada) no se repite.
        function archivosDe(modulo: string): string[] {
          const inicio = [...chunks.values()].find((c) =>
            c.facadeModuleId?.replaceAll("\\", "/").endsWith(`/${modulo}`)
          );
          if (!inicio) throw new Error(`routeev-preload: no hay chunk para ${modulo}`);
          const archivos = new Set<string>();
          const pendientes = [inicio.fileName];
          while (pendientes.length) {
            const nombre = pendientes.pop()!;
            const chunk = chunks.get(nombre);
            if (!chunk || archivos.has(nombre)) continue;
            archivos.add(nombre);
            for (const css of chunk.viteMetadata?.importedCss ?? []) archivos.add(css);
            pendientes.push(...chunk.imports);
          }
          return [...archivos].filter((archivo) => !html.includes(archivo));
        }

        const rutas = Object.fromEntries(
          Object.entries(RUTAS_PRECARGADAS).map(([ruta, modulo]) => [ruta, archivosDe(modulo)])
        );
        const script = `(function(){var r=${JSON.stringify(rutas)};var f=r["/"+(location.pathname.split("/")[1]||"")];if(!f)return;for(var i=0;i<f.length;i++){var l=document.createElement("link"),c=/\\.css$/.test(f[i]);l.rel=c?"preload":"modulepreload";if(c)l.as="style";l.crossOrigin="anonymous";l.href="/"+f[i];document.head.appendChild(l)}})();`;

        const fuentes = outputs
          .filter((o) => o.type === "asset" && FUENTES_PRECARGADAS.test(o.fileName))
          .map((o) => ({
            tag: "link",
            attrs: {
              rel: "preload",
              as: "font",
              type: "font/woff2",
              href: `/${o.fileName}`,
              crossorigin: true,
            },
            injectTo: "head" as const,
          }));

        return {
          html,
          tags: [...fuentes, { tag: "script", children: script, injectTo: "head" as const }],
        };
      },
    },
  };
}

const ROUTEEV_API_PRODUCCION = "https://api.routeev.uy";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadPlugin()],
  server: {
    // La API de produccion no tiene http://localhost:5173 en su
    // CORS_ALLOW_ORIGINS (routeev-api es otro repo, no se toca desde acá).
    // El proxy evita el problema del todo en dev: el navegador le habla a
    // este mismo origen (sin CORS de por medio) y Vite reenvia por detras.
    proxy: {
      "/api": {
        target: ROUTEEV_API_PRODUCCION,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // ".claude" son las carpetas de trabajo del agente: worktrees de git con
    // una copia entera del proyecto adentro, tests incluidos. Sin excluirlas,
    // `npm test` corre la suite de este proyecto una vez por worktree, contra
    // codigo viejo y con OTRO setupFiles (el de cada copia), asi que ademas
    // fallan. Misma exclusion que en eslint.config.js, por lo mismo.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
