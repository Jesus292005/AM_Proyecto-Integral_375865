import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { Href } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { clienteConsultas } from '../datos/clienteConsultas';
import { supabase } from '../supabase/cliente';
import { configurarGoogle } from './iniciarSesionGoogle';

/**
 * Estado de la sesión. `conSesion` incluye la sesión guardada que no se pudo renovar por falta de
 * internet: el usuario sigue dentro y cada pantalla muestra su "sin conexión" (F01 §6.3).
 * `sinSesion.motivo`: `inicial` (no había sesión guardada), `terminada` (expiró o el servidor la
 * revocó, F01 §6.2) o `cerrada` (el usuario cerró sesión, F01 §7).
 */
export type EstadoSesion =
  | { tipo: 'cargando' }
  | { tipo: 'sinSesion'; motivo: 'inicial' | 'terminada' | 'cerrada' }
  | { tipo: 'conSesion' };

/** Resultado de cerrar sesión. Si no es `exito`, la sesión sigue abierta. */
export type ResultadoCierreSesion = { tipo: 'exito' } | { tipo: 'sinConexion' } | { tipo: 'error' };

interface ValorSesion {
  estado: EstadoSesion;
  /** Ruta protegida que se intentó abrir sin sesión; tras iniciar sesión se continúa ahí (CA8). */
  destino: Href | null;
  guardarDestino: (destino: Href | null) => void;
  cerrarSesion: () => Promise<ResultadoCierreSesion>;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

// `enCurso` mientras se cierra sesión a propósito; `cerrada` cuando Supabase ya borró la sesión.
type EstadoCierre = 'no' | 'enCurso' | 'cerrada';

function registrar(mensaje: string, error: unknown) {
  console.error(`[cierre de sesión] ${mensaje}`, error);
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'cargando' });
  const [destino, guardarDestino] = useState<Href | null>(null);
  const cierre = useRef<EstadoCierre>('no');

  useEffect(() => {
    let activo = true;

    // Sesión guardada al abrir la app (F01 §6.1). Si mientras tanto llegó un evento, manda el evento.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!activo) return;
      // Sin internet, Supabase no puede renovar un token vencido y responde "sin sesión" con un
      // error de red, pero conserva la sesión guardada y la renueva al volver la conexión.
      const sinConexion = error !== null && isAuthRetryableFetchError(error);
      const inicial: EstadoSesion =
        data.session !== null || sinConexion
          ? { tipo: 'conSesion' }
          : { tipo: 'sinSesion', motivo: 'inicial' };
      setEstado((actual) => (actual.tipo === 'cargando' ? inicial : actual));
    });

    // Inicio de sesión, renovación y cierre (incluye una sesión que el servidor ya no renueva, §6.2).
    // INITIAL_SESSION se ignora: el estado inicial lo resuelve `getSession`.
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'INITIAL_SESSION') return;
      if (sesion !== null) {
        setEstado({ tipo: 'conSesion' });
        return;
      }
      if (cierre.current === 'enCurso') {
        cierre.current = 'cerrada';
        // Cierre a propósito: el siguiente inicio de sesión va a Inicio, no a la última ruta.
        guardarDestino(null);
        setEstado({ tipo: 'sinSesion', motivo: 'cerrada' });
        return;
      }
      setEstado({ tipo: 'sinSesion', motivo: 'terminada' });
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  /**
   * F01 §7: cierra la sesión de este teléfono en Supabase (`local`: los demás dispositivos siguen
   * dentro), luego la de Google, y vacía la caché de datos (CA4).
   */
  const cerrarSesion = useCallback(async (): Promise<ResultadoCierreSesion> => {
    cierre.current = 'enCurso';
    let error: unknown = null;
    try {
      ({ error } = await supabase.auth.signOut({ scope: 'local' }));
    } catch (e) {
      error = e;
    }
    // El oyente de eventos lo cambia durante el `await`; TypeScript no puede saberlo.
    const cerrada = (cierre.current as EstadoCierre) === 'cerrada';
    cierre.current = 'no';

    // Supabase borra la sesión del teléfono aunque no alcance al servidor, salvo si el token venció
    // y no hay internet para renovarlo: entonces la conserva y el usuario sigue dentro.
    if (!cerrada) {
      if (isAuthRetryableFetchError(error)) return { tipo: 'sinConexion' };
      registrar('Supabase no cerró la sesión', error);
      return { tipo: 'error' };
    }
    if (error !== null) registrar('La sesión se borró del teléfono, pero no en el servidor', error);

    try {
      configurarGoogle();
      // Al volver a iniciar sesión, Google muestra otra vez el selector de cuentas.
      await GoogleSignin.signOut();
    } catch (e) {
      registrar('Google no cerró la sesión', e);
    }

    clienteConsultas.clear();
    return { tipo: 'exito' };
  }, []);

  const valor = useMemo(
    () => ({ estado, destino, guardarDestino, cerrarSesion }),
    [estado, destino, cerrarSesion],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (valor === null) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.');
  return valor;
}
