import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { CertaintyLine, type CertaintyPoint } from "./CertaintyLine";

const feasibleTrip: CertaintyPoint[] = [
  { km: 0, batteryPct: 90 },
  { km: 200, batteryPct: 25 },
  { km: 200, batteryPct: 80, chargeStop: true },
  { km: 340, batteryPct: 45 },
];

const infeasibleTrip: CertaintyPoint[] = [
  { km: 0, batteryPct: 60 },
  { km: 250, batteryPct: -5 },
];

describe("CertaintyLine", () => {
  it("renders a feasible trip with a neutral label", () => {
    render(
      <LanguageProvider>
        <CertaintyLine points={feasibleTrip} scale="macro" />
      </LanguageProvider>
    );
    expect(screen.getByRole("img", { name: /perfil de batería a lo largo del viaje/i })).toBeInTheDocument();
  });

  it("flags an infeasible trip in its accessible name", () => {
    render(
      <LanguageProvider>
        <CertaintyLine points={infeasibleTrip} scale="macro" />
      </LanguageProvider>
    );
    expect(screen.getByRole("img", { name: /no es factible/i })).toBeInTheDocument();
  });

  it("renders nothing with fewer than two points", () => {
    const { container } = render(
      <LanguageProvider>
        <CertaintyLine points={[{ km: 0, batteryPct: 90 }]} />
      </LanguageProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
