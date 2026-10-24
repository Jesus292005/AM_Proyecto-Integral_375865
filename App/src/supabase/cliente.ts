import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { almacenSeguro } from './almacenSeguro';
import type { Database } from './tipos-db';

// Solo variables públicas (V5, D14). Expo las incrusta al compilar, por eso se leen una por una.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clavePublica = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !clavePublica) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_KEY en App/.env (ver App/.env.example).',
  );
}

export const supabase = createClient<Database>(url, clavePublica, {
  auth: {
    storage: almacenSeguro,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// La renovación automática del token corre solo con la app en primer plano; al volver se
// reanuda (y renueva el token si venció mientras estaba en segundo plano).
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
