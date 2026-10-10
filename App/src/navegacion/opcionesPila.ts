import type { NativeStackNavigationOptions } from 'expo-router/native-stack';

import { useTema } from '../tema';

/**
 * Opciones comunes de las pilas: sin encabezado nativo (cada pantalla usa EncabezadoPantalla),
 * fondo del tema y transición de desvanecer (05-ui §8: corta y sin rebotes; en Android la pila
 * nativa no permite fijar la duración, solo el tipo).
 */
export function useOpcionesPila(): NativeStackNavigationOptions {
  const { colores } = useTema();
  return {
    headerShown: false,
    contentStyle: { backgroundColor: colores.fondo },
    animation: 'fade',
  };
}
