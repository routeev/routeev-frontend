import { describe, expect, it } from "vitest";
import { operatorBadge } from "./operatorBadge";

describe("operatorBadge", () => {
  it("reconoce cada uno de los operadores relevados", () => {
    expect(operatorBadge("eONE")).toEqual({ iniciales: "EO", clase: "opEone" });
    expect(operatorBadge("DISA EVE Move")).toEqual({ iniciales: "EV", clase: "opEve" });
    expect(operatorBadge("Evergo")).toEqual({ iniciales: "EG", clase: "opEvergo" });
    expect(operatorBadge("DMC Mobility")).toEqual({ iniciales: "DM", clase: "opDmc" });
    expect(operatorBadge("Mobility Recharge")).toEqual({ iniciales: "MR", clase: "opRecharge" });
    expect(operatorBadge("UMT")).toEqual({ iniciales: "UMT", clase: "opUmt" });
  });

  it("Evergo no matchea contra el substring de DISA EVE Move", () => {
    // Evergo contiene "EVE" (de "EVErgo"), pero tiene que caer en su propio
    // operador, no en el de DISA.
    expect(operatorBadge("Evergo")?.clase).toBe("opEvergo");
  });

  it("DMC Mobility no matchea contra el substring de Mobility Recharge", () => {
    expect(operatorBadge("DMC Mobility")?.clase).toBe("opDmc");
  });

  it("UTE, sin marca reconocible, o vacio: sin badge -- se queda con el rayo generico", () => {
    expect(operatorBadge("UTE Mueve")).toBeNull();
    expect(operatorBadge("Privado")).toBeNull();
    expect(operatorBadge("Un operador que releven mañana")).toBeNull();
    expect(operatorBadge(undefined)).toBeNull();
    expect(operatorBadge(null)).toBeNull();
    expect(operatorBadge("")).toBeNull();
  });
});
