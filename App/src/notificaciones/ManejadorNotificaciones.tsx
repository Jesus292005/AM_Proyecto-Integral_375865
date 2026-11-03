import { router } from 'expo-router';
import { useEffect } from 'react';

import { rutaDeNotificacion } from './rutaNotificacion';
import {
  configurarPresentacion,
  olvidarNotificacionTocada,
  useDatosNotificacionTocada,
} from './sistema';

configurarPresentacion();

/**
 * Tocar una notificación navega a la ruta que trae (F11a R8, D78); con datos inválidos se ignora.
 * Sin sesión, la guardia guarda la ruta y continúa tras iniciar sesión (F01 CA8).
 */
export function ManejadorNotificaciones() {
  const datos = useDatosNotificacionTocada();

  useEffect(() => {
    if (datos === undefined || datos === null) return;
    olvidarNotificacionTocada();
    const ruta = rutaDeNotificacion(datos);
    if (ruta !== null) router.navigate(ruta);
  }, [datos]);

  return null;
}
