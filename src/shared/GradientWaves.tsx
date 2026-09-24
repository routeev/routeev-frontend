import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import { esRenderizadoPorSoftware } from "./gpu";
import styles from "./GradientWaves.module.css";

// Portado de react-bits (https://reactbits.dev/backgrounds/gradient-waves,
// MIT). Mismo shader/logica de render; se adapta la clase (CSS Module en vez
// de utilidades Tailwind, que este proyecto no usa) y se agrega el manejo de
// prefers-reduced-motion que el original no tiene (front2.md 3.6: toda
// animacion nueva lo respeta) -- con reduced motion se pinta un frame fijo y
// no arranca el loop de requestAnimationFrame.

export type GradientWavesDetail = "low" | "medium" | "high";

export interface GradientWavesProps {
  horizonColor?: string;
  waveColor?: string;
  crestColor?: string;
  speed?: number;
  amplitude?: number;
  waveScale?: number;
  waveRatio?: number;
  swell?: number;
  turbulence?: number;
  tilt?: number;
  zoom?: number;
  height?: number;
  fogDepth?: number;
  detail?: GradientWavesDetail;
  brightness?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  parallaxStrength?: number;
  grain?: boolean;
  grainIntensity?: number;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

// El fondo se redibuja como mucho 30 veces por segundo (ver el bucle mas
// abajo). No es una animacion que alguien siga con la vista: es una ola de
// fondo, lenta y desenfocada.
const MS_MINIMOS_ENTRE_FRAMES = 1000 / 30;

const detailToSteps = (detail: GradientWavesDetail): number => {
  if (detail === "low") return 40.0;
  if (detail === "high") return 110.0;
  return 70.0;
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uParallax;
uniform bool uEnableMouse;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.1) break;
    dist += 0.9 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }
  return dist;
}

void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
  float c, s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, 30.0);
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot); s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x; s = nuv.y;
  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

  if (uEnableMouse) {
    float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
    float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
    c = cos(yaw); s = sin(yaw);
    dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
    c = cos(pitch); s = sin(pitch);
    dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  }

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
  vec3 col = mix(uHorizonColor, body, t);
  col *= uBrightness;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(t, 0.0, 1.0) * uOpacity;
  if (uGrain > 0.5) {
    float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
    alpha += (g - 0.5) * uGrainIntensity;
  }
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`;

type GradientWavesCtx = {
  renderer: InstanceType<typeof Renderer>;
  program: InstanceType<typeof Program>;
  mesh: InstanceType<typeof Mesh>;
};
const ctxMap = new WeakMap<HTMLDivElement, GradientWavesCtx>();

export function GradientWaves({
  horizonColor = "#5227FF",
  waveColor = "#FF9FFC",
  crestColor = "#FFFFFF",
  speed = 0.4,
  amplitude = 2.5,
  waveScale = 0.6,
  waveRatio = 0.9,
  swell = 35,
  turbulence = 20,
  tilt = 1.11,
  zoom = 1.0,
  height = 5.5,
  fogDepth = 15,
  detail = "medium",
  brightness = 1.0,
  opacity = 1.0,
  mouseInteraction = true,
  parallaxStrength = 0.5,
  grain = true,
  grainIntensity = 0.05,
  className = "",
}: GradientWavesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const enableMouseRef = useRef<boolean>(mouseInteraction);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: InstanceType<typeof Renderer>;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        // dpr fijo en 1, no el del dispositivo. En una pantalla HiDPI
        // (devicePixelRatio 2) el canvas pasa a tener CUATRO veces los
        // pixeles, y cada pixel de mas cuesta una pasada entera de
        // raymarching -- el gasto mas caro de todo este componente. En un
        // fondo desenfocado y sin bordes duros la diferencia visual a 2x es
        // practicamente nula; la de rendimiento no.
        dpr: 1,
      });
      if (!renderer.gl) throw new Error("no webgl context");
    } catch {
      // Sin soporte de WebGL (o en jsdom, que no lo implementa): se deja el
      // fondo liso de la pagina en vez de romper el resto de la pantalla.
      return;
    }

    if (esRenderizadoPorSoftware(renderer.gl)) {
      // El canvas todavia no se agrego al DOM, asi que no queda nada que
      // limpiar mas que el contexto: se lo pierde a proposito para devolver
      // los recursos ya mismo en vez de esperar al recolector. Queda visible
      // el degradado CSS del contenedor (ver el style de mas abajo).
      renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.4 },
        uAmplitude: { value: 2.5 },
        uWaveScale: { value: 0.6 },
        uWaveRatio: { value: 0.9 },
        uSwell: { value: 35 },
        uTurbulence: { value: 20 },
        uTilt: { value: 1.11 },
        uZoom: { value: 1.0 },
        uHeight: { value: 5.5 },
        uFogDepth: { value: 15 },
        uSteps: { value: 70.0 },
        uBrightness: { value: 1.0 },
        uOpacity: { value: 1.0 },
        uGrain: { value: 1.0 },
        uGrainIntensity: { value: 0.05 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uParallax: { value: 0.5 },
        uEnableMouse: { value: true },
        uHorizonColor: { value: new Float32Array([1, 1, 1]) },
        uWaveColor: { value: new Float32Array([1, 1, 1]) },
        uCrestColor: { value: new Float32Array([1, 1, 1]) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctxMap.set(container, { renderer, program, mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      const res = (program.uniforms.iResolution as { value: Float32Array }).value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    const currentMouse: [number, number] = [0.5, 0.5];
    const targetMouse: [number, number] = [0.5, 0.5];

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse[0] = (e.clientX - rect.left) / rect.width;
      targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    const onPointerLeave = () => {
      targetMouse[0] = 0.5;
      targetMouse[1] = 0.5;
    };
    if (!reduceMotion) {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
    }

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const t0 = performance.now();
    let ultimoRender = 0;

    const loop = (t: number) => {
      // Se pide el frame siguiente ANTES de decidir si se dibuja: el bucle
      // sigue vivo aunque este frame se saltee.
      raf = requestAnimationFrame(loop);
      // Tope de 30 fps: a 60 este shader dibuja el doble de veces por
      // segundo para un fondo que se mueve despacio a proposito (speed 0.3),
      // donde la diferencia no se ve. iTime sigue saliendo del reloj real,
      // asi que la ola avanza a la misma velocidad de siempre -- lo unico
      // que baja es cuantas veces por segundo se recalcula.
      if (t - ultimoRender < MS_MINIMOS_ENTRE_FRAMES) return;
      ultimoRender = t;

      (program.uniforms.iTime as { value: number }).value = (t - t0) * 0.001;
      const tx = enableMouseRef.current ? targetMouse[0] : 0.5;
      const ty = enableMouseRef.current ? targetMouse[1] : 0.5;
      currentMouse[0] += 0.05 * (tx - currentMouse[0]);
      currentMouse[1] += 0.05 * (ty - currentMouse[1]);
      const m = (program.uniforms.uMouse as { value: Float32Array }).value;
      m[0] = currentMouse[0];
      m[1] = currentMouse[1];
      renderer.render({ scene: mesh });
    };

    const tryStart = () => {
      if (reduceMotion) return;
      if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) tryStart();
        else tryStop();
      },
      { threshold: 0 },
    );
    io.observe(container);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      ctxMap.delete(container);
      try {
        container.removeChild(canvas);
      } catch {
        // el nodo ya pudo haber sido desmontado
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = ctxMap.get(container);
    if (!ctx) return;
    const { program, renderer, mesh } = ctx;
    const u = program.uniforms as Record<string, { value: number | boolean | Float32Array }>;

    enableMouseRef.current = mouseInteraction;

    u.uSpeed.value = speed;
    u.uAmplitude.value = amplitude;
    u.uWaveScale.value = waveScale;
    u.uWaveRatio.value = waveRatio;
    u.uSwell.value = swell;
    u.uTurbulence.value = turbulence;
    u.uTilt.value = tilt;
    u.uZoom.value = zoom;
    u.uHeight.value = height;
    u.uFogDepth.value = fogDepth;
    u.uSteps.value = detailToSteps(detail);
    u.uBrightness.value = brightness;
    u.uOpacity.value = opacity;
    u.uGrain.value = grain ? 1.0 : 0.0;
    u.uGrainIntensity.value = grainIntensity;
    u.uParallax.value = parallaxStrength;
    u.uEnableMouse.value = mouseInteraction;
    const hc = u.uHorizonColor.value as Float32Array;
    const wc = u.uWaveColor.value as Float32Array;
    const cc = u.uCrestColor.value as Float32Array;
    const h = hexToRgb(horizonColor);
    const w = hexToRgb(waveColor);
    const cr = hexToRgb(crestColor);
    hc[0] = h[0];
    hc[1] = h[1];
    hc[2] = h[2];
    wc[0] = w[0];
    wc[1] = w[1];
    wc[2] = w[2];
    cc[0] = cr[0];
    cc[1] = cr[1];
    cc[2] = cr[2];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderer.render({ scene: mesh });
    }
  }, [
    horizonColor,
    waveColor,
    crestColor,
    speed,
    amplitude,
    waveScale,
    waveRatio,
    swell,
    turbulence,
    tilt,
    zoom,
    height,
    fogDepth,
    detail,
    brightness,
    opacity,
    grain,
    grainIntensity,
    mouseInteraction,
    parallaxStrength,
  ]);

  // El degradado va SIEMPRE en el contenedor, no solo cuando falta la placa:
  // cuando el shader se monta, su canvas lo tapa por completo, y cuando no
  // (sin WebGL, o emulado por software) queda esto en su lugar. Hacerlo al
  // reves -- pintarlo solo en el caso de fallback -- obligaria a re-renderizar
  // el componente desde dentro del efecto para avisar cual de los dos caminos
  // se tomo, y ademas dejaria un parpadeo negro entre el primer render y el
  // momento en que el shader dibuja su primer frame.
  //
  // Los colores salen de las mismas props que el shader, asi que cambiarle la
  // paleta a la ola arrastra al degradado sin tener que acordarse de tocar el
  // CSS. Los porcentajes imitan como reparte el shader la escena: el horizonte
  // ocupa la mayor parte y la cresta apenas asoma abajo.
  const [cr, cg, cb] = hexToRgb(crestColor);
  const fondoDeReserva = [
    `radial-gradient(120% 80% at 50% 100%, rgba(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)}, ${0.18 * opacity}) 0%, transparent 70%)`,
    `linear-gradient(to bottom, ${horizonColor} 0%, ${horizonColor} 45%, ${waveColor} 100%)`,
  ].join(", ");

  return (
    <div
      ref={containerRef}
      className={[styles.container, className].filter(Boolean).join(" ")}
      style={{ background: fondoDeReserva }}
    />
  );
}
