import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { Href } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '../supabase/cliente';

/**
 * Estado de la sesión. `conSesion` incluye la sesión guardada que no se pudo renovar por falta de
 * internet: el usuario sigue dentro y cada pantalla muestra su "sin conexión" (F01 §6.3).
 */
export type EstadoSesion = { tipo: 'cargando' } | { tipo: 'sinSesion' } | { tipo: 'conSesion' };

interface ValorSesion {
  estado: EstadoSesion;
  /** Ruta protegida que se intentó abrir sin sesión; tras iniciar sesión se continúa ahí (CA8). */
  destino: Href | null;
  guardarDestino: (destino: Href | null) => void;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'cargando' });
  const [destino, guardarDestino] = useState<Href | null>(null);

  useEffect(() => {
    let activo = true;

    // Sesión guardada al abrir la app (F01 §6.1). Si mientras tanto llegó un evento, manda el evento.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!activo) return;
      // Sin internet, Supabase no puede renovar un token vencido y responde "sin sesión" con un
      // error de red, pero conserva la sesión guardada y la renueva al volver la conexión.
      const sinConexion = error !== null && isAuthRetryableFetchError(error);
      const inicial: EstadoSesion =
        data.session !== null || sinConexion ? { tipo: 'conSesion' } : { tipo: 'sinSesion' };
      setEstado((actual) => (actual.tipo === 'cargando' ? inicial : actual));
    });

    // Inicio de sesión, renovación y cierre (incluye una sesión que el servidor ya no renueva, §6.2).
    // INITIAL_SESSION se ignora: el estado inicial lo resuelve `getSession`.
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'INITIAL_SESSION') return;
      setEstado(sesion !== null ? { tipo: 'conSesion' } : { tipo: 'sinSesion' });
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo(() => ({ estado, destino, guardarDestino }), [estado, destino]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (valor === null) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.');
  return valor;
}
