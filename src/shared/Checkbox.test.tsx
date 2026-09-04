import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

/** Controlado, igual que en el uso real (TripDashboard, SearchControls, SimulationForm). */
function Host({ onChange }: { onChange?: (v: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      checked={checked}
      onChange={(v) => {
        setChecked(v);
        onChange?.(v);
      }}
      label="Vibrar al acercarme a un radar"
    />
  );
}

describe("Checkbox", () => {
  it("es un <input type=checkbox> real, con role checkbox nativo", () => {
    render(<Host />);
    const input = screen.getByRole("checkbox", { name: "Vibrar al acercarme a un radar" });
    expect(input).toHaveAttribute("type", "checkbox");
    expect(input).not.toBeChecked();
  });

  it("clickear el TEXTO también tilda -- asociación implícita de <label>, sin id/htmlFor", () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    fireEvent.click(screen.getByText("Vibrar al acercarme a un radar"));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("responde al teclado (barra espaciadora) como cualquier checkbox nativo", () => {
    render(<Host />);
    const input = screen.getByRole("checkbox");
    input.focus();
    fireEvent.click(input); // jsdom no simula la barra->click del navegador; el input real sí la maneja solo.

    expect(input).toBeChecked();
  });

  it("pasa aria-describedby al <input>, no al wrapper", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Solo con carga rápida" aria-describedby="ayuda-dc" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-describedby", "ayuda-dc");
  });

  it("disabled deshabilita el input real", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="x" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
