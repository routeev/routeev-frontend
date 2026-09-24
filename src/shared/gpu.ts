// Nombres que delatan que WebGL NO esta corriendo en una placa de verdad
// sino emulado por el procesador. Chrome usa SwiftShader; Mesa en Linux,
// llvmpipe; Windows sin driver util cae en el "Basic Render Driver".
const RENDERERS_POR_SOFTWARE = ["swiftshader", "llvmpipe", "software", "basic render"];

/**
 * Si WebGL esta emulado por software conviene no montar nada que dependa de
 * una placa (hoy: el shader de fondo de la landing, ver GradientWaves).
 *
 * Distinguir esto importa porque el caso peor no es "no hay WebGL" -- ese ya
 * falla solo y se maneja con un try/catch. Es cuando WebGL SI existe y corre
 * en el procesador: no falla nada, el efecto se monta igual y cada pixel se
 * calcula sin placa que lo acelere, con la pagina entera sintiendose pesada
 * aunque las metricas de carga den perfectas. Chrome apaga la aceleracion por
 * su cuenta en bastantes equipos (drivers viejos, placas en su lista negra,
 * modo ahorro), asi que no es un caso de laboratorio.
 *
 * Vive en su propio archivo y no junto al componente: exportar funciones
 * sueltas desde un archivo de componente rompe el fast refresh de Vite
 * (react-refresh/only-export-components).
 */
export function esRenderizadoPorSoftware(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  // Sin la extension no hay forma de saberlo (algunos navegadores la esconden
  // por privacidad). Se asume que hay placa: es el comportamiento de siempre,
  // y apagar el efecto ante la duda seria peor que dejarlo andando.
  if (!info) return false;
  const renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();
  return RENDERERS_POR_SOFTWARE.some((nombre) => renderer.includes(nombre));
}
