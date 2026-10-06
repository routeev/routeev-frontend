import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PhotoLookup } from "../api/showroom";

vi.mock("../api/showroom", () => ({ showroomImage: vi.fn() }));

// Cada pedido a la API queda "colgado" hasta que el test lo resuelve a mano,
// para poder armar cuáles están en vuelo y cuáles esperando turno.
interface Colgado {
  nombre: string;
  resolver: (v: PhotoLookup) => void;
}
let colgados: Colgado[];
let showroomImage: ReturnType<typeof vi.fn>;
let cola: typeof import("./photoQueue");

const FOTO: PhotoLookup = { encontrada: true, url: "/foto" };
const SIN_FOTO: PhotoLookup = { encontrada: false };

async function cargarModulos() {
  // photoQueue guarda su estado a nivel de módulo (caché, pendientes, en
  // vuelo): cada test arranca con un módulo recién importado.
  vi.resetModules();
  colgados = [];
  showroomImage = (await import("../api/showroom")).showroomImage as unknown as ReturnType<typeof vi.fn>;
  // El vi.fn() del mock sobrevive a resetModules(): sin esto las llamadas de un
  // test se acumulan en el siguiente.
  showroomImage.mockReset();
  showroomImage.mockImplementation(
    (nombre: string) => new Promise<PhotoLookup>((resolver) => colgados.push({ nombre, resolver }))
  );
  cola = await import("./photoQueue");
}

/** Deja correr los .then pendientes (resolver una promesa los encola como microtareas). */
const asentar = () => new Promise<void>((r) => setTimeout(r, 0));
const pedidos = () => showroomImage.mock.calls.map((c) => c[0] as string);
const resolverPrimero = async (v: PhotoLookup = FOTO) => {
  colgados.shift()!.resolver(v);
  await asentar();
};

describe("solicitarFoto", () => {
  beforeEach(cargarModulos);

  it("pide una sola vez un nombre aunque lo pidan varias tarjetas, y a todas les avisa", async () => {
    const a = vi.fn();
    const b = vi.fn();
    cola.solicitarFoto("BYD Dolphin", a);
    cola.solicitarFoto("BYD Dolphin", b);

    expect(pedidos()).toEqual(["BYD Dolphin"]);
    await resolverPrimero();
    expect(a).toHaveBeenCalledWith(FOTO);
    expect(b).toHaveBeenCalledWith(FOTO);
  });

  it("no tiene más de dos pedidos en vuelo, y al liberarse uno sale el siguiente en orden de llegada", async () => {
    for (const n of ["a", "b", "c", "d"]) cola.solicitarFoto(n, vi.fn());
    expect(pedidos()).toEqual(["a", "b"]);

    await resolverPrimero();
    expect(pedidos()).toEqual(["a", "b", "c"]);
  });

  it("un pedido que todavía no salió y que ya nadie quiere, nunca sale (la cola no se tapa con tarjetas que ya no están)", async () => {
    cola.solicitarFoto("a", vi.fn());
    cola.solicitarFoto("b", vi.fn());
    const cancelarC = cola.solicitarFoto("c", vi.fn());
    cola.solicitarFoto("d", vi.fn());

    cancelarC();
    await resolverPrimero();
    await resolverPrimero();

    expect(pedidos()).toEqual(["a", "b", "d"]);
  });

  it("si otra tarjeta sigue esperando el mismo nombre, cancelar una no lo descarta", async () => {
    cola.solicitarFoto("a", vi.fn());
    cola.solicitarFoto("b", vi.fn());
    const queda = vi.fn();
    const cancelarUna = cola.solicitarFoto("c", vi.fn());
    cola.solicitarFoto("c", queda);

    cancelarUna();
    await resolverPrimero();
    expect(pedidos()).toContain("c");

    colgados.find((x) => x.nombre === "c")!.resolver(FOTO);
    await asentar();
    expect(queda).toHaveBeenCalledWith(FOTO);
  });

  it("después de descartar un nombre, volver a pedirlo lo pide de nuevo (no queda una promesa que nunca se resuelve)", async () => {
    cola.solicitarFoto("a", vi.fn());
    cola.solicitarFoto("b", vi.fn());
    cola.solicitarFoto("c", vi.fn())();

    const otraVez = vi.fn();
    cola.solicitarFoto("c", otraVez);
    await resolverPrimero();

    expect(pedidos().filter((n) => n === "c")).toHaveLength(1);
    colgados.find((x) => x.nombre === "c")!.resolver(SIN_FOTO);
    await asentar();
    expect(otraVez).toHaveBeenCalledWith(SIN_FOTO);
  });

  it("cancelar un pedido que ya está en vuelo solo evita el aviso: el resultado queda para la próxima tarjeta", async () => {
    const aviso = vi.fn();
    const cancelar = cola.solicitarFoto("a", aviso);
    expect(pedidos()).toEqual(["a"]);

    cancelar();
    await resolverPrimero();
    expect(aviso).not.toHaveBeenCalled();

    const despues = vi.fn();
    cola.solicitarFoto("a", despues);
    await asentar();
    expect(despues).toHaveBeenCalledWith(FOTO);
    expect(pedidos()).toEqual(["a"]);
  });

  it("un error de red se trata como 'sin foto' y no frena la cola", async () => {
    showroomImage.mockImplementationOnce(() => Promise.reject(new Error("503")));
    const aviso = vi.fn();
    cola.solicitarFoto("a", aviso);
    cola.solicitarFoto("b", vi.fn());
    await asentar();

    expect(aviso).toHaveBeenCalledWith(SIN_FOTO);
    expect(pedidos()).toEqual(["a", "b"]);
  });
});

describe("observePhoto", () => {
  type Entrada = Pick<IntersectionObserverEntry, "target" | "isIntersecting">;
  let disparar: (entradas: Entrada[]) => void;

  beforeEach(async () => {
    class ObserverFalso {
      constructor(cb: (entradas: Entrada[]) => void) {
        disparar = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
    }
    // El observer es un singleton perezoso del módulo: se instala la clase
    // falsa ANTES de reimportarlo, para que se cree con ella.
    vi.stubGlobal("IntersectionObserver", ObserverFalso);
    await cargarModulos();
  });

  const entra = (el: Element) => disparar([{ target: el, isIntersecting: true }]);
  const sale = (el: Element) => disparar([{ target: el, isIntersecting: false }]);

  it("no pide la foto hasta que la tarjeta se acerca a la pantalla", () => {
    cola.observePhoto(document.createElement("div"), "BYD Seal", vi.fn());
    expect(pedidos()).toEqual([]);
  });

  it("una tarjeta que sale de pantalla antes de que le llegue el turno no pide su foto (scroll largo)", async () => {
    // Dos tarjetas ya ocupan los dos lugares: la tercera queda esperando.
    cola.solicitarFoto("a", vi.fn());
    cola.solicitarFoto("b", vi.fn());
    const el = document.createElement("div");
    cola.observePhoto(el, "c", vi.fn());

    entra(el);
    sale(el);
    await resolverPrimero();

    expect(pedidos()).toEqual(["a", "b"]);
  });

  it("si vuelve a entrar después de haberse ido, su pedido se rehace", async () => {
    cola.solicitarFoto("a", vi.fn());
    cola.solicitarFoto("b", vi.fn());
    const alResolver = vi.fn();
    const el = document.createElement("div");
    cola.observePhoto(el, "c", alResolver);

    entra(el);
    sale(el);
    entra(el);
    await resolverPrimero();
    expect(pedidos()).toEqual(["a", "b", "c"]);

    colgados.find((x) => x.nombre === "c")!.resolver(FOTO);
    await asentar();
    expect(alResolver).toHaveBeenCalledWith(FOTO);
  });

  it("al desmontar la tarjeta (cambio de filtro) se cancela lo que le quedaba pendiente", async () => {
    cola.solicitarFoto("a", vi.fn());
    cola.solicitarFoto("b", vi.fn());
    const el = document.createElement("div");
    const limpiar = cola.observePhoto(el, "c", vi.fn());

    entra(el);
    limpiar();
    await resolverPrimero();

    expect(pedidos()).toEqual(["a", "b"]);
  });
});
