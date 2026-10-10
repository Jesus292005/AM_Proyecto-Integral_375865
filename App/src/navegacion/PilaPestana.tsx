import { Stack } from 'expo-router';

import { useOpcionesPila } from './opcionesPila';

/** Pila de una pestaña: sus pantallas de detalle conservan el menú inferior. */
export function PilaPestana() {
  return <Stack screenOptions={useOpcionesPila()} />;
}
