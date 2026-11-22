// F28 R4: la misma forma que valida el servidor, para adelantar el aviso en S14. El servidor
// decide (`NOMBRE_INVALIDO`); esto solo evita mandar algo que de seguro rechazará.

export const NOMBRE_MAXIMO = 20;
const NOMBRE_MINIMO = 3;
const PERMITIDOS = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ._-]+$/;
const ALGUNA_LETRA_O_NUMERO = /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/;

/** Espacios repetidos juntos y los de los extremos fuera, como el servidor. */
export function normalizarNombre(nombre: string): string {
  return nombre.replace(/\s+/g, ' ').trim();
}

export function esNombreValido(nombre: string): boolean {
  const limpio = normalizarNombre(nombre);
  return (
    limpio.length >= NOMBRE_MINIMO &&
    limpio.length <= NOMBRE_MAXIMO &&
    PERMITIDOS.test(limpio) &&
    ALGUNA_LETRA_O_NUMERO.test(limpio)
  );
}
