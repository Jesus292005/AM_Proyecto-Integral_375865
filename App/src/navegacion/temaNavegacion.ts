import { DarkTheme, type Theme } from 'expo-router';

import type { Tema } from '../tema';

/**
 * Tema de React Navigation construido con los tokens (D62: solo tema oscuro). Sin él, el
 * navegador usa su fondo claro por defecto y se ve un destello blanco al cambiar de pantalla.
 */
export function temaNavegacion({ colores }: Tema): Theme {
  return {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      primary: colores.acento,
      background: colores.fondo,
      card: colores.superficie,
      text: colores.texto,
      border: colores.linea,
      notification: colores.acento,
    },
  };
}
