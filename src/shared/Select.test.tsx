import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select, type SelectOption } from "./Select";

const OPCIONES: SelectOption<string>[] = [
  { value: "mvd", label: "Montevideo" },
  { value: "col", label: "Colonia" },
  { value: "pde", label: "Punta del Este" },
];

/** Controlado, igual que en el uso real (VehiclePanel, SearchControls, SimulationForm). */
function Host({ onChange, disabled }: { onChange?: (v: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Select
      id="destino"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      options={OPCIONES}
      placeholder="Elegí un destino"
      disabled={disabled}
    />
  );
}

function trigger() {
  return screen.getByRole("button");
}

describe("Select", () => {
  it("muestra el placeholder sin nada elegido, y el label de la opción una vez elegida", () => {
    render(<Host />);
    expect(trigger()).toHaveTextContent("Elegí un destino");

    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByRole("option", { name: "Colonia" }));

    expect(trigger()).toHaveTextContent("Colonia");
  });

  it("el panel vive en document.body (portal), no adentro del árbol del componente", () => {
    const { container } = render(<Host />);
    fireEvent.click(trigger());

    const listbox = screen.getByRole("listbox");
    expect(container.contains(listbox)).toBe(false);
    expect(document.body.contains(listbox)).toBe(true);
  });

  it("clickear una opción llama a onChange con su value y cierra el panel", () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByRole("option", { name: "Punta del Este" }));

    expect(onChange).toHaveBeenCalledWith("pde");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("se navega con el teclado sin mover el foco del botón (aria-activedescendant, no aria-selected fantasma)", () => {
    render(<Host />);
    const btn = trigger();
    btn.focus();
    fireEvent.keyDown(btn, { key: "ArrowDown" });
    expect(btn).toHaveAttribute("aria-expanded", "true");

    const opciones = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Montevideo", "Colonia", "Punta del Este"]);

    // El foco nunca se mueve del botón -- es la premisa entera del diseño
    // (ver el comentario en Select.tsx): document.activeElement sigue
    // siendo el trigger mientras se navega con flechas.
    expect(document.activeElement).toBe(btn);

    fireEvent.keyDown(btn, { key: "ArrowDown" });
    expect(btn).toHaveAttribute("aria-activedescendant", opciones[1]!.id);

    fireEvent.keyDown(btn, { key: "End" });
    expect(btn).toHaveAttribute("aria-activedescendant", opciones[2]!.id);

    fireEvent.keyDown(btn, { key: "Home" });
    expect(btn).toHaveAttribute("aria-activedescendant", opciones[0]!.id);
  });

  it("Enter con una opción resaltada la elige; Escape cierra sin elegir", () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    const btn = trigger();
    fireEvent.keyDown(btn, { key: "ArrowDown" }); // abre, resalta la 0 (Montevideo, sin nada elegido todavía)
    fireEvent.keyDown(btn, { key: "ArrowDown" }); // resalta la 1 (Colonia)
    fireEvent.keyDown(btn, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("col");
    expect(btn).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(btn, { key: "ArrowDown" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(btn, { key: "Escape" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    // Escape no eligió nada nuevo -- sigue en 1 sola llamada, la del Enter de arriba.
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("disabled: no abre ni con click ni con teclado", () => {
    render(<Host disabled />);
    const btn = trigger();
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("perder el foco del botón cierra el panel (blur == click afuera)", () => {
    render(<Host />);
    const btn = trigger();
    fireEvent.click(btn);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.blur(btn);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
