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
