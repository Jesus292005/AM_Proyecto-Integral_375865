// Cliente de Supabase falso para pruebas: controla la sesión guardada y emite eventos de sesión.
import {
  AuthRetryableFetchError,
  type AuthChangeEvent,
  type AuthError,
  type Session,
} from '@supabase/supabase-js';

type Oyente = (evento: AuthChangeEvent, sesion: Session | null) => void;
type ResultadoInicial = { session: Session | null; error: AuthError | null };

export const sesionDePrueba: Session = {
  access_token: 'token-de-prueba',
  refresh_token: 'renovacion-de-prueba',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    app_metadata: { provider: 'google' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-24T00:00:00Z',
  },
};

let inicial: Promise<ResultadoInicial> = Promise.resolve({ session: null, error: null });
const oyentes = new Set<Oyente>();

export const supabaseFalso = {
  auth: {
    getSession: async () => {
      const { session, error } = await inicial;
      return { data: { session }, error };
    },
    onAuthStateChange: (oyente: Oyente) => {
      oyentes.add(oyente);
      return { data: { subscription: { unsubscribe: () => oyentes.delete(oyente) } } };
    },
  },
};

/** Sesión que la app encuentra guardada al abrir. */
export function simularSesionGuardada() {
  inicial = Promise.resolve({ session: sesionDePrueba, error: null });
}

export function simularSinSesion() {
  inicial = Promise.resolve({ session: null, error: null });
}

/** Sesión guardada con el token vencido y sin internet para renovarlo (F01 §6.3). */
export function simularSinConexionConSesionGuardada() {
  const error = new AuthRetryableFetchError('Network request failed', 0);
  inicial = Promise.resolve({ session: null, error });
}

/** La lectura de la sesión guardada no termina (pantalla de carga). */
export function simularLecturaPendiente() {
  inicial = new Promise(() => {});
}

export function emitirEventoSesion(evento: AuthChangeEvent, sesion: Session | null) {
  for (const oyente of oyentes) oyente(evento, sesion);
}
