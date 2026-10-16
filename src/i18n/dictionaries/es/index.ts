import type { Dictionary } from "../en";
import { auth } from "./auth";
import { common } from "./common";
import { landing } from "./landing";
import { legal } from "./legal";
import { map } from "./map";
import { nav } from "./nav";
import { profile } from "./profile";
import { shared } from "./shared";
import { showroom } from "./showroom";
import { welcome } from "./welcome";

// Tipado contra Dictionary (la forma de en/index.ts): si a este objeto le
// falta una clave, le sobra una, o el tipo de una función no coincide con su
// versión en inglés, esto no compila -- es el chequeo que evita que los dos
// idiomas se desincronicen en silencio.
export const es: Dictionary = {
  common,
  nav,
  map,
  profile,
  auth,
  shared,
  landing,
  legal,
  showroom,
  welcome,
};
