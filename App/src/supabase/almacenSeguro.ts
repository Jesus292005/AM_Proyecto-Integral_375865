import * as SecureStore from 'expo-secure-store';

import type { SupportedStorage } from '@supabase/supabase-js';

// La sesión de Supabase pesa ~3–4 KB y SecureStore puede rechazar valores de más de 2048 bytes
// (iOS, D53). Cada valor se guarda en trozos: `<clave>.n` lleva cuántos son y `<clave>.<i>` cada uno.
export const MAX_BYTES_TROZO = 2000;

function bytesUtf8(caracter: string): number {
  const codigo = caracter.codePointAt(0) ?? 0;
  if (codigo < 0x80) return 1;
  if (codigo < 0x800) return 2;
  if (codigo < 0x10000) return 3;
  return 4;
}

/** Parte el texto en trozos de hasta `maxBytes` bytes en UTF-8, sin cortar un carácter. */
export function partirEnTrozos(texto: string, maxBytes = MAX_BYTES_TROZO): string[] {
  const trozos: string[] = [];
  let actual = '';
  let bytes = 0;
  // `for...of` recorre caracteres completos (no corta los pares sustitutos).
  for (const caracter of texto) {
    const tam = bytesUtf8(caracter);
    if (bytes + tam > maxBytes) {
      trozos.push(actual);
      actual = '';
      bytes = 0;
    }
    actual += caracter;
    bytes += tam;
  }
  if (actual !== '' || trozos.length === 0) trozos.push(actual);
  return trozos;
}

const claveCuenta = (clave: string) => `${clave}.n`;
const claveTrozo = (clave: string, i: number) => `${clave}.${i}`;

async function leerCuenta(clave: string): Promise<number | null> {
  const valor = await SecureStore.getItemAsync(claveCuenta(clave));
  if (valor === null) return null;
  const cuenta = Number(valor);
  return Number.isInteger(cuenta) && cuenta > 0 ? cuenta : null;
}

async function borrarTrozos(clave: string, desde: number, hasta: number) {
  for (let i = desde; i < hasta; i++) await SecureStore.deleteItemAsync(claveTrozo(clave, i));
}

// Las operaciones se hacen en fila: una escritura y un borrado simultáneos mezclarían trozos.
let fila: Promise<unknown> = Promise.resolve();
function enFila<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = fila.then(operacion);
  fila = resultado.catch(() => undefined);
  return resultado;
}

/** Almacenamiento de la sesión de Supabase en el almacenamiento seguro del teléfono (F01 §5.6). */
export const almacenSeguro: SupportedStorage = {
  getItem: (clave) =>
    enFila(async () => {
      const cuenta = await leerCuenta(clave);
      if (cuenta === null) return null;
      let valor = '';
      for (let i = 0; i < cuenta; i++) {
        const trozo = await SecureStore.getItemAsync(claveTrozo(clave, i));
        // Un trozo perdido deja el valor incompleto: se trata como si no hubiera sesión.
        if (trozo === null) return null;
        valor += trozo;
      }
      return valor;
    }),

  setItem: (clave, valor) =>
    enFila(async () => {
      const anterior = (await leerCuenta(clave)) ?? 0;
      const trozos = partirEnTrozos(valor);
      for (const [i, trozo] of trozos.entries()) {
        await SecureStore.setItemAsync(claveTrozo(clave, i), trozo);
      }
      await SecureStore.setItemAsync(claveCuenta(clave), String(trozos.length));
      await borrarTrozos(clave, trozos.length, anterior);
    }),

  removeItem: (clave) =>
    enFila(async () => {
      const cuenta = (await leerCuenta(clave)) ?? 0;
      await SecureStore.deleteItemAsync(claveCuenta(clave));
      await borrarTrozos(clave, 0, cuenta);
    }),
};
