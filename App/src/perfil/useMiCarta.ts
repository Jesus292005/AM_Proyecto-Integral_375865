import { useQuery } from '@tanstack/react-query';

import { obtenerMiCarta } from './datos';

/** Mi carta (F20); la comparten S09 y la barra superior (F25 R4). */
export function useMiCarta() {
  return useQuery({ queryKey: ['mi-carta'], queryFn: obtenerMiCarta });
}
