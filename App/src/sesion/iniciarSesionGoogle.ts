import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '../supabase/cliente';

/** Resultado de un intento de inicio de sesión; cada caso es un estado de S01 (F01 §10–11). */
export type ResultadoInicioSesion =
  | { tipo: 'exito' }
  | { tipo: 'cancelado' }
  | { tipo: 'sinConexion' }
  | { tipo: 'sinServiciosGoogle' }
  | { tipo: 'error' };

// Error de red de los servicios de Google en Android (`CommonStatusCodes.NETWORK_ERROR`).
const CODIGO_ERROR_RED_GOOGLE = '7';

let configurado = false;

/** También se usa al cerrar sesión: si la app abrió con sesión guardada, Google no se configuró. */
export function configurarGoogle() {
  if (configurado) return;
  // Público (V5): Google lo usa para emitir el token con la audiencia que valida Supabase.
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en App/.env (ver App/.env.example).');
  }
  GoogleSignin.configure({ webClientId });
  configurado = true;
}

/** "Se registra el error" (F01 §10): por ahora en la consola; no hay servicio de registros. */
function registrar(mensaje: string, error: unknown) {
  console.error(`[inicio de sesión] ${mensaje}`, error);
}

function resultadoDeErrorGoogle(error: unknown): ResultadoInicioSesion {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) return { tipo: 'cancelado' };
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { tipo: 'sinServiciosGoogle' };
    if (error.code === CODIGO_ERROR_RED_GOOGLE) return { tipo: 'sinConexion' };
  }
  registrar('Google rechazó el inicio de sesión', error);
  return { tipo: 'error' };
}

/**
 * Flujo de F01 §5: selector nativo de cuentas de Google → token de identidad → Supabase.
 * La app solo envía el token; nombre y correo los toma el servidor del token validado (V1).
 * Al terminar bien, el proveedor de sesión recibe `SIGNED_IN` y la guardia continúa al destino.
 */
export async function iniciarSesionGoogle(): Promise<ResultadoInicioSesion> {
  configurarGoogle();

  let idToken: string | null;
  try {
    // Si faltan o están desactualizados, Android muestra su propio aviso para instalarlos.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const respuesta = await GoogleSignin.signIn();
    if (respuesta.type === 'cancelled') return { tipo: 'cancelado' };
    idToken = respuesta.data.idToken;
  } catch (error) {
    return resultadoDeErrorGoogle(error);
  }

  if (idToken === null) {
    registrar('Google no entregó el token de identidad', null);
    return { tipo: 'error' };
  }

  try {
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error === null) return { tipo: 'exito' };
    if (isAuthRetryableFetchError(error)) return { tipo: 'sinConexion' };
    registrar('Supabase rechazó el token', error);
  } catch (error) {
    registrar('Supabase no respondió', error);
  }
  return { tipo: 'error' };
}
