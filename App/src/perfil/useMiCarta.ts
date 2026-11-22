import { useQuery } from '@tanstack/react-query';

import { VIGENCIA_PERFIL_MS } from './vigencia';
import { obtenerMiCarta } from './datos';

/** Mi carta (F20); la comparten S09 y la barra superior (F25 R4). */
export function useMiCarta({ siempreAlMontar = false }: { siempreAlMontar?: boolean } = {}) {
  return useQuery({
    queryKey: ['mi-carta'],
    queryFn: obtenerMiCarta,
    staleTime: VIGENCIA_PERFIL_MS,
    // S09 la pide cada vez que se abre (F13 R7), aunque la barra la haya pedido hace poco.
    refetchOnMount: siempreAlMontar ? 'always' : true,
  });
}
