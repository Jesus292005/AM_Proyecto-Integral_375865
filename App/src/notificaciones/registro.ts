import { supabase } from '../supabase/cliente';
import {
  guardarToken,
  leerAhoraNo,
  leerPermiso,
  leerTokenGuardado,
  obtenerToken,
  olvidarTokenGuardado,
  pedirPermiso,
  type EstadoPermiso,
} from './sistema';

// Registro del teléfono para los recordatorios (F11a R1–R3). El servidor asigna el token a quien
// lo registra (`registrar_dispositivo`).

/** Con permiso, obtiene el token y lo registra (R2). Sin permiso no hace nada. */
export async function registrarDispositivo(): Promise<void> {
  if ((await leerPermiso()) !== 'concedido') return;
  const token = await obtenerToken();
  const { error } = await supabase.rpc('registrar_dispositivo', { token });
  if (error) throw new Error(`No se pudo registrar el dispositivo: ${error.message}`);
  await guardarToken(token);
}

/** Después de guardar una predicción: preguntar solo si el sistema no ha preguntado y no hay "Ahora no" (R1). */
export async function debePreguntar(): Promise<boolean> {
  return (await leerPermiso()) === 'sinPreguntar' && !(await leerAhoraNo());
}

/** "Sí, avísame": pide el permiso del sistema y, si lo da, registra el teléfono. */
export async function aceptarRecordatorios(): Promise<EstadoPermiso> {
  const permiso = await pedirPermiso();
  if (permiso === 'concedido') await registrarDispositivo();
  return permiso;
}

/** Al cerrar sesión: borra el token de este teléfono del usuario que sale (R3). */
export async function olvidarDispositivo(): Promise<void> {
  const token = await leerTokenGuardado();
  if (token === null) return;
  const { error } = await supabase.from('dispositivo').delete().eq('token', token);
  if (error) throw new Error(`No se pudo borrar el dispositivo: ${error.message}`);
  await olvidarTokenGuardado();
}
