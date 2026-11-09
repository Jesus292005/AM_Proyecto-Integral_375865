// F12 R4 (D37): solo un código que leyó el escáner de la app (S07) une sin otro toque. S07 lo
// registra aquí, en memoria, y S06 lo toma una sola vez. Un enlace externo con los mismos
// parámetros (la app tiene `scheme`) no pasa por S07: solo llena el campo y espera "Unirse".

let pendiente: { codigo: string; lectura: string } | null = null;
let lecturas = 0;

/** S07: registra el código leído y devuelve el número de lectura que viaja en la ruta. */
export function registrarLectura(codigo: string): string {
  lecturas += 1;
  pendiente = { codigo, lectura: String(lecturas) };
  return pendiente.lectura;
}

/** S06: true una sola vez si `codigo` y `lectura` son los de la última lectura de S07. */
export function tomarLectura(codigo: string, lectura: string): boolean {
  if (pendiente === null || pendiente.codigo !== codigo || pendiente.lectura !== lectura) return false;
  pendiente = null;
  return true;
}
