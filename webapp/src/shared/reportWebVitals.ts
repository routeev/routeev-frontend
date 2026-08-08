import { onCLS, onINP, onLCP } from "web-vitals/attribution";

// Instrumentacion temporal para medir INP en el lab (solucion.md, plan de
// accion #1). Cada interaccion que termina reportando INP tira un log con el
// desglose de fase (input delay / processing / presentation) y, si aplica,
// el selector del elemento involucrado -- lo que hace falta para confirmar
// o descartar los hallazgos de la auditoria sin adivinar.
export function reportWebVitals(): void {
  onINP(
    (metric) => {
      const att = metric.attribution;
      console.log(
        `[web-vitals] INP=${metric.value.toFixed(0)}ms rating=${metric.rating} target=${att?.interactionTarget ?? "?"} type=${att?.interactionType ?? "?"} inputDelay=${att?.inputDelay?.toFixed(0)}ms processing=${att?.processingDuration?.toFixed(0)}ms presentationDelay=${att?.presentationDelay?.toFixed(0)}ms`
      );
    },
    // reportAllChanges: sin esto el callback solo corre una vez, al ocultarse
    // la pagina -- para probar interaccion por interaccion en una sesion de
    // diagnostico hace falta el valor apenas cada una termina. durationThreshold
    // bajo (default 40ms) para ver tambien interacciones rapidas, no solo las
    // que ya superan el umbral de "bueno".
    { reportAllChanges: true, durationThreshold: 0 }
  );

  onLCP((metric) => {
    console.log(`[web-vitals] LCP=${metric.value.toFixed(0)}ms rating=${metric.rating}`);
  });

  onCLS((metric) => {
    console.log(`[web-vitals] CLS=${metric.value.toFixed(3)} rating=${metric.rating}`);
  });
}
