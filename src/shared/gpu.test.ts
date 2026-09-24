import { describe, expect, it } from "vitest";
import { esRenderizadoPorSoftware } from "./gpu";

// A quien le mostramos la ola animada y a quien el degradado quieto. El
// componente ya contemplaba "no hay WebGL" (try/catch al crear el Renderer),
// pero el caso caro es el otro: WebGL que SI existe y corre emulado por el
// procesador. Ahi no falla nada -- el shader se monta y calcula cada pixel
// sin placa que lo acelere, y el sitio entero se siente trabado aunque las
// metricas de carga den bien. Chrome apaga la aceleracion solo en bastantes
// equipos, asi que no alcanza con probarlo en una maquina con placa.
//
// No se monta el componente (jsdom no implementa WebGL): se prueba la regla,
// que es la parte que puede equivocarse, con un contexto de mentira que
// devuelve el nombre del renderer como lo haria el navegador.

const UNMASKED_RENDERER = 37446;

function glFalso(renderer: string | null, conExtension = true) {
  return {
    getExtension: (nombre: string) =>
      nombre === "WEBGL_debug_renderer_info" && conExtension ? { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER } : null,
    getParameter: (p: number) => (p === UNMASKED_RENDERER ? renderer : null),
  } as unknown as WebGLRenderingContext;
}

describe("esRenderizadoPorSoftware", () => {
  // Nombres reales: SwiftShader es el emulador de Chrome, llvmpipe el de Mesa
  // en Linux, y el "Basic Render Driver" el de Windows sin driver util.
  it.each([
    ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)"],
    ["Mesa/X.org, llvmpipe (LLVM 15.0.7, 256 bits)"],
    ["Microsoft Basic Render Driver"],
    ["Software Rasterizer"],
  ])("detecta %s como software", (renderer) => {
    expect(esRenderizadoPorSoftware(glFalso(renderer))).toBe(true);
  });

  // Los de placa real no se tocan: tienen que seguir viendo la ola. El
  // primero es exactamente el de la maquina donde se diagnostico esto.
  it.each([
    ["ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)"],
    ["ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"],
    ["Apple M2"],
    ["AMD Radeon Pro 5500M OpenGL Engine"],
  ])("deja pasar %s", (renderer) => {
    expect(esRenderizadoPorSoftware(glFalso(renderer))).toBe(false);
  });

  // Sin la extension no hay forma de saberlo (hay navegadores que la esconden
  // por privacidad). Ante la duda se asume que hay placa: apagar el fondo
  // sin motivo seria peor que dejarlo andando.
  it("sin la extension asume que hay placa", () => {
    expect(esRenderizadoPorSoftware(glFalso("lo que sea", false))).toBe(false);
  });

  it("no revienta si el renderer viene vacio", () => {
    expect(esRenderizadoPorSoftware(glFalso(null))).toBe(false);
    expect(esRenderizadoPorSoftware(glFalso(""))).toBe(false);
  });

  it("no depende de mayusculas", () => {
    expect(esRenderizadoPorSoftware(glFalso("SWIFTSHADER DEVICE"))).toBe(true);
  });
});
