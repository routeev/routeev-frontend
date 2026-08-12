import { describe, expect, it } from "vitest";
import {
  MODEL_SEARCH_MAX_OPTIONS,
  MODEL_SEARCH_MIN_CHARS,
  filterModelLabels,
} from "./evModelSearch";

const labels = [
  "Nissan Leaf (40 kWh)",
  "BYD Seagull EV300",
  "BYD Seagull EV380",
  "BYD Yuan Pro GS",
  "Citroën ë-C4",
  "Tesla Model 3 Standard Range",
];

describe("filterModelLabels", () => {
  it("no ofrece nada hasta el mínimo de letras (la lista entera no se despliega al clickear)", () => {
    expect(filterModelLabels(labels, "")).toEqual([]);
    expect(filterModelLabels(labels, "se")).toEqual([]);
    expect(filterModelLabels(labels, "  se  ")).toEqual([]);
  });

  it("con el mínimo escrito filtra por subcadena, sin importar mayúsculas", () => {
    expect(filterModelLabels(labels, "seagull")).toEqual(["BYD Seagull EV300", "BYD Seagull EV380"]);
    expect(filterModelLabels(labels, "YUAN")).toEqual(["BYD Yuan Pro GS"]);
    expect(filterModelLabels(labels, "no-existe")).toEqual([]);
  });

  it("ignora tildes en ambos lados: 'citroen' encuentra 'Citroën'", () => {
    expect(filterModelLabels(labels, "citroen")).toEqual(["Citroën ë-C4"]);
    expect(filterModelLabels(["Citroen e-C4"], "citroën")).toEqual(["Citroen e-C4"]);
  });

  it("corta en el tope de opciones para no volcar el catálogo entero al DOM", () => {
    const many = Array.from({ length: MODEL_SEARCH_MAX_OPTIONS + 20 }, (_, i) => `Tesla Model ${i}`);
    expect(filterModelLabels(many, "tesla")).toHaveLength(MODEL_SEARCH_MAX_OPTIONS);
  });

  it("exporta un mínimo acorde a lo que promete el placeholder", () => {
    expect(MODEL_SEARCH_MIN_CHARS).toBe(3);
  });
});
