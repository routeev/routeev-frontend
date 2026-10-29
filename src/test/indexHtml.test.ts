import { describe, expect, it } from "vitest";
// ?raw y no node:fs a proposito: `npm run build` corre `tsc -b` sobre los tests
// tambien, y este proyecto no tiene @types/node (ni hace falta) -- importar
// node:fs/node:path o usar __dirname rompe el BUILD DE PRODUCCION, no solo el
// test. Asi lo carga Vite, que es quien lo resuelve igual en test y en build.
import html from "../../index.html?raw";
import { HALLOWEEN } from "../season/season";

// El index.html no lo revisa nadie: no pasa por TypeScript, ni por ESLint, y
// Vite lo sirve tal cual esté (un comentario mal cerrado no es un error de
// build). Eso lo deja como el único archivo del frontend donde un typo llega
// a producción sin que se queje ninguna herramienta.
//
// Y ya pasó: el comentario que documenta el script del tema se cerraba con la
// marca de fin de comentario de CSS/JS en vez de la de HTML, así que el
// comentario seguía abierto y se tragaba el <script> entero -- 26 líneas más
// abajo, hasta el cierre del bloque del favicon. El script nunca se ejecutó en
// producción, y el parpadeo que ese script existe para evitar volvió sin que
// se notara en ninguna revisión.
//
// Lo que sigue no prueba el HTML "en general": prueba las dos cosas que ese
// archivo tiene que garantizar y que un comentario roto rompe en silencio --
// que el script del tema llegue vivo al navegador, y que las etiquetas de
// SEO/previsualización queden en el <head>, que es el único lugar donde los
// scrapers sin JS (WhatsApp, Twitter, Google) las leen.
//
// Se parsea con el DOMParser de jsdom, que implementa el mismo algoritmo de
// parseo que el navegador (incluidos los modos de inserción que mandan al
// <body> todo lo que venga después de un texto suelto en el <head>). Mirar el
// archivo con una expresión regular no serviría: el bug original es justamente
// que el texto SE VE bien y el parser lo interpreta distinto.

const doc = new DOMParser().parseFromString(html, "text/html");

describe("index.html", () => {
  // El motivo de existir del script: aplicar data-theme antes del primer
  // paint. Si queda dentro de un comentario, el único lugar que aplica el
  // tema pasa a ser App.tsx (dentro del ciclo de React, después de bajar y
  // ejecutar el bundle) y quien eligió claro ve el flash oscuro.
  it("el script del tema llega vivo al DOM (no comentado)", () => {
    const inline = Array.from(doc.querySelectorAll("script:not([src])"));
    expect(inline.some((s) => s.textContent?.includes("routeev_theme"))).toBe(true);
  });

  // Las fechas de la temporada están en dos lugares: el script inline (que es
  // el que decide, antes del primer paint) y src/season/season.ts. Si se
  // desincronizan, una de las dos copias miente sobre cuándo termina.
  it("el script de la temporada usa las mismas fechas que season.ts", () => {
    const script = Array.from(doc.querySelectorAll("script:not([src])"))
      .map((s) => s.textContent ?? "")
      .find((t) => t.includes("data-season"));
    expect(script).toBeDefined();
    const fechas = [...script!.matchAll(/Date\.parse\("([^"]+)"\)/g)].map((m) => Date.parse(m[1]!));
    expect(fechas).toEqual([HALLOWEEN.start, HALLOWEEN.end]);
  });

  // Un comentario sin cerrar deja texto suelto en el <head>; el parser cierra
  // el <head> ahí mismo y manda al <body> TODO lo que viene después. El
  // síntoma es invisible en el navegador (React repone las etiquetas con
  // Helmet al montar) y solo se nota en los scrapers, que no ejecutan JS.
  it("las etiquetas de SEO y previsualización quedan en el <head>", () => {
    for (const selector of [
      "title",
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:image"]',
      'meta[name="twitter:card"]',
      'link[rel="icon"]',
      'meta[name="viewport"]',
    ]) {
      const el = doc.querySelector(selector);
      expect(el, `falta ${selector}`).not.toBeNull();
      expect(el?.parentElement?.tagName, `${selector} tendría que estar en <head>`).toBe("HEAD");
    }
  });

  // El <body> es el punto de montaje de React y el script de entrada (que
  // Vite mueve al <head> al construir). Fuera de #root, texto suelto no puede
  // venir de otro lado que un comentario roto -- y se ve en pantalla. Lo de
  // adentro de #root es a propósito (ver el test siguiente). Las etiquetas
  // de <head> que se caen al <body> por ese mismo motivo las cubre el test
  // de arriba; este agarra el síntoma visible.
  it("el <body> no tiene texto suelto fuera de #root ni etiquetas de <head>", () => {
    const root = doc.getElementById("root");
    expect(root?.parentElement?.tagName).toBe("BODY");
    const fuera = doc.body.cloneNode(true) as HTMLElement;
    fuera.querySelector("#root")?.remove();
    expect(fuera.textContent?.trim()).toBe("");
    expect(doc.body.querySelectorAll("meta, link, title").length).toBe(0);
  });

  // Lo que lee quien no ejecuta JS (buscadores, el verificador de sitios de
  // AWS Activate): con #root vacío veían una página en blanco. React lo
  // reemplaza en el primer render. El contacto tiene que ser del dominio: un
  // correo gratuito acá contradice el dominio de la empresa.
  it("#root trae una descripción del sitio con el contacto del dominio", () => {
    const texto = doc.getElementById("root")?.textContent ?? "";
    expect(texto).toContain("RouteEV");
    expect(texto).toContain("contacto@routeev.uy");
    expect(texto).not.toMatch(/@(gmail|hotmail|outlook|yahoo)\./i);
  });
});
