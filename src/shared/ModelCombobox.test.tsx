import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { MODEL_SEARCH_MIN_CHARS, filterModelLabels } from "./evModelSearch";
import { ModelCombobox } from "./ModelCombobox";

const CATALOGO = ["Nissan Leaf (40 kWh)", "BYD Yuan Plus", "BYD Yuan Pro GS", "Tesla Model 3"];

/** El combobox es controlado: quien lo usa es dueño del texto y del filtro. */
function Host() {
  const [value, setValue] = useState("");
  return (
    <ModelCombobox
      id="test-model"
      label="Modelo"
      placeholder="Escribí el modelo..."
      value={value}
      options={filterModelLabels(CATALOGO, value)}
      minChars={MODEL_SEARCH_MIN_CHARS}
      onChange={setValue}
    />
  );
}

function renderCombobox() {
  render(<Host />);
  return screen.getByRole("combobox", { name: "Modelo" });
}

describe("ModelCombobox", () => {
  it("no despliega nada hasta el mínimo de letras, y lo dice", () => {
    const input = renderCombobox();
    fireEvent.change(input, { target: { value: "yu" } });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/al menos 3 letras/i)).toBeInTheDocument();
  });

  it("se navega y se elige con el teclado, con el ARIA que espera un lector de pantalla", () => {
    const input = renderCombobox();
    fireEvent.change(input, { target: { value: "yuan" } });

    expect(input).toHaveAttribute("aria-expanded", "true");
    const opciones = screen.getAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["BYD Yuan Plus", "BYD Yuan Pro GS"]);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", opciones[0]!.id);
    expect(opciones[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", opciones[1]!.id);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("BYD Yuan Plus");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("Escape cierra la lista sin borrar lo escrito", () => {
    const input = renderCombobox();
    fireEvent.change(input, { target: { value: "yuan" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveValue("yuan");
  });

  // Lo más importante del widget: los datos del auto se pueden completar a
  // mano, así que escribir un modelo que no está en el catálogo tiene que ser
  // un camino válido y no un callejón sin salida.
  it("no atrapa a quien escribe un modelo que no está en el catálogo", () => {
    const input = renderCombobox();
    fireEvent.change(input, { target: { value: "Chery Tiggo 4" } });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).toHaveValue("Chery Tiggo 4");
    expect(screen.getByText(/completar los datos a mano/i)).toBeInTheDocument();
  });
});
