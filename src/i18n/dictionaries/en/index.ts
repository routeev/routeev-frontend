import { auth } from "./auth";
import { common } from "./common";
import { landing } from "./landing";
import { legal } from "./legal";
import { map } from "./map";
import { nav } from "./nav";
import { profile } from "./profile";
import { shared } from "./shared";
import { showroom } from "./showroom";

// Diccionario canónico: la forma de este objeto (incluyendo qué claves son
// strings simples y cuáles son funciones con qué parámetros) es la que
// impone TypeScript sobre es/index.ts -- agregar una clave acá sin su
// equivalente en es/*.ts (o viceversa) no compila. Es inglés y no español
// por historia del proyecto (todo arrancó hardcodeado en español), no por
// ninguna razón técnica.
export const en = { common, nav, map, profile, auth, shared, landing, legal, showroom };

export type Dictionary = typeof en;
