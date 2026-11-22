import { useQuery } from '@tanstack/react-query';

import { VIGENCIA_PERFIL_MS } from './vigencia';
import { obtenerMiPerfil } from './datos';

export const claveMiPerfil = ['mi-perfil'] as const;

/** Mi perfil (F28 R7): una sola consulta con caché para S09, S12, S14 y la barra superior (F25). */
export function useMiPerfil() {
  return useQuery({ queryKey: claveMiPerfil, queryFn: obtenerMiPerfil, staleTime: VIGENCIA_PERFIL_MS });
}
