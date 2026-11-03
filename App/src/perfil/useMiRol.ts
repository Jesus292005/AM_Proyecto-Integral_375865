import { useQuery } from '@tanstack/react-query';

import { obtenerMiRol } from './datos';

/**
 * Mi rol, para mostrar u ocultar S10 (F09 R1). Solo decide qué se ve: el servidor verifica el rol
 * en cada operación. Se vacía al cerrar sesión con el resto de la caché (F01 CA4).
 */
export function useMiRol() {
  return useQuery({ queryKey: ['mi-rol'], queryFn: obtenerMiRol, staleTime: Infinity });
}
