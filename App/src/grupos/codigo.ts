import { z } from 'zod';

// Código de invitación (F07 R2): 8 caracteres de un alfabeto de 31 sin 0 O 1 I L. El servidor lo
// genera; la app lo valida antes de llamar (F07 CA9) y lo muestra como ABCD-EFGH. El mismo
// esquema valida lo que lee el escáner de QR (F12 R3).

const FORMATO = /^[2-9A-HJKMNP-Z]{8}$/;

/** Ignora mayúsculas y minúsculas, guiones y espacios, como el servidor. */
export function normalizarCodigo(texto: string): string {
  return texto.replace(/[\s-]/g, '').toUpperCase();
}

/** Texto escrito o leído → código canónico (sin guion), o error si no tiene el formato. */
export const esquemaCodigoInvitacion = z.string().transform(normalizarCodigo).pipe(z.string().regex(FORMATO));

/** `ABCDEFGH` → `ABCD-EFGH` (F07 R2). */
export function formatearCodigo(codigo: string): string {
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}
