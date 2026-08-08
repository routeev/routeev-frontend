import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import type { CSSProperties } from "react";
import { useEffect } from "react";

// Portado de react-bits (https://reactbits.dev/components/counter, MIT):
// efecto odometro -- cada digito gira verticalmente hasta caer en su lugar,
// como el cuentakilometros de un auto real (coherente con la identidad de
// "cabina de instrumentos" de RouteEV). Se saca la dependencia de Tailwind
// del original (estilos inline, como ya hacia la mayor parte del componente)
// y se agrega el respeto a prefers-reduced-motion que no traia (front2.md
// 3.6): con reduced motion, cada digito se muestra directo, sin girar.

export type PlaceValue = number | ".";

interface NumberRollProps {
  mv: MotionValue<number>;
  number: number;
  height: number;
}

function NumberRoll({ mv, number, height }: NumberRollProps) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) memo -= 10 * height;
    return memo;
  });

  return (
    <motion.span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", y }}>
      {number}
    </motion.span>
  );
}

function getValueRoundedToPlace(value: number, place: number): number {
  const scaled = value / place;
  const nearest = Math.round(scaled);
  const tolerance = 1e-9 * Math.max(1, Math.abs(scaled));
  const normalized = Math.abs(scaled - nearest) < tolerance ? nearest : scaled;
  return Math.floor(normalized);
}

interface DigitProps {
  place: PlaceValue;
  value: number;
  height: number;
  digitStyle?: CSSProperties;
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
  const shouldReduceMotion = useReducedMotion();
  const valueRoundedToPlace = place === "." ? 0 : getValueRoundedToPlace(value, place);
  const animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    if (place !== ".") animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace, place]);

  if (place === ".") {
    return (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", height, width: "fit-content", ...digitStyle }}>
        .
      </span>
    );
  }

  const baseStyle: CSSProperties = { height, position: "relative", width: "1ch", fontVariantNumeric: "tabular-nums" };

  if (shouldReduceMotion) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", ...baseStyle, ...digitStyle }}>
        {valueRoundedToPlace % 10}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", overflow: "hidden", ...baseStyle, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <NumberRoll key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  );
}

export interface CounterProps {
  value: number;
  fontSize?: number;
  places?: PlaceValue[];
  gap?: number;
  textColor?: string;
  fontWeight?: CSSProperties["fontWeight"];
  digitStyle?: CSSProperties;
  /** Color de fondo detras del degrade que difumina el borde superior/inferior de cada digito -- pasar el mismo fondo real del contenedor. */
  fadeBackground?: string;
}

const defaultPlaces = (value: number): PlaceValue[] =>
  [...Math.round(value).toString()].map((_, i, a) => 10 ** (a.length - i - 1));

export function Counter({
  value,
  fontSize = 32,
  places = defaultPlaces(value),
  gap = 1,
  textColor = "inherit",
  fontWeight = "inherit",
  digitStyle,
  fadeBackground = "transparent",
}: CounterProps) {
  const height = fontSize;
  const gradientHeight = fontSize * 0.18;

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          fontSize,
          display: "flex",
          gap,
          overflow: "hidden",
          lineHeight: 1,
          color: textColor,
          fontWeight,
        }}
      >
        {places.map((place, i) => (
          <Digit key={`${place}-${i}`} place={place} value={value} height={height} digitStyle={digitStyle} />
        ))}
      </span>
      <span style={{ pointerEvents: "none", position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <span style={{ height: gradientHeight, background: `linear-gradient(to bottom, ${fadeBackground}, transparent)` }} />
        <span style={{ height: gradientHeight, background: `linear-gradient(to top, ${fadeBackground}, transparent)` }} />
      </span>
    </span>
  );
}
