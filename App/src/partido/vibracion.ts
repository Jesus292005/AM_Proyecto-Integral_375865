import { NotificationFeedbackType, notificationAsync } from 'expo-haptics';

/**
 * Vibración corta al guardar una predicción: una de éxito y otra distinta si falla (F24 R6, 05-ui
 * §8). Si el teléfono no puede vibrar, no pasa nada: la boleta o el error ya dicen qué ocurrió.
 */
export function vibrar(tipo: 'exito' | 'error'): void {
  notificationAsync(
    tipo === 'exito' ? NotificationFeedbackType.Success : NotificationFeedbackType.Error,
  ).catch((error: unknown) => console.warn('[vibracion] No se pudo vibrar', error));
}
