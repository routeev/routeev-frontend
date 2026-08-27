import { describe, expect, it } from "vitest";
import { claimPickRole } from "./pickSequence";

describe("claimPickRole", () => {
  it("uses the store mode when no click is still in flight", () => {
    expect(claimPickRole("origin", [])).toBe("origin");
    expect(claimPickRole("destination", [])).toBe("destination");
  });

  // El bug reportado: dos toques seguidos tenian que dar origen y despues
  // destino, y daban origen dos veces (o uno solo).
  it("advances to the destination once a pending click already took the origin", () => {
    expect(claimPickRole("origin", ["origin"])).toBe("destination");
  });

  it("keeps assigning the destination for further clicks in the same burst", () => {
    expect(claimPickRole("origin", ["origin", "destination"])).toBe("destination");
    expect(claimPickRole("destination", ["destination"])).toBe("destination");
    expect(claimPickRole("destination", ["destination", "destination"])).toBe("destination");
  });

  it("assigns origin then destination across a whole burst of clicks", () => {
    const claimed: ("origin" | "destination")[] = [];
    for (let i = 0; i < 3; i++) claimed.push(claimPickRole("origin", claimed));
    expect(claimed).toEqual(["origin", "destination", "destination"]);
  });
});

describe("claimPickRole con un rol pedido a mano", () => {
  // El caso que rompia: alguien con origen Y destino ya puestos aprieta la
  // chincheta del ORIGEN para corregirlo, toca, ve que erro por poco y vuelve a
  // tocar antes de que el primer toque haya aterrizado. Sin esto, el segundo
  // toque se llevaba "destino" y le borraba el destino que ya tenia.
  it("no auto-avanza a destino: los dos toques corrigen el origen", () => {
    expect(claimPickRole("origin", [], "origin")).toBe("origin");
    expect(claimPickRole("origin", ["origin"], "origin")).toBe("origin");
    expect(claimPickRole("origin", ["origin", "origin"], "origin")).toBe("origin");
  });

  it("lo mismo cuando lo pedido es el destino", () => {
    expect(claimPickRole("destination", ["destination"], "destination")).toBe("destination");
    // Aunque el store todavia diga "origin" porque el pick anterior no aterrizo.
    expect(claimPickRole("origin", ["origin"], "destination")).toBe("destination");
  });

  it("sin rol pedido sigue valiendo el auto-avance de siempre", () => {
    expect(claimPickRole("origin", ["origin"], null)).toBe("destination");
    expect(claimPickRole("origin", [], null)).toBe("origin");
  });
});
