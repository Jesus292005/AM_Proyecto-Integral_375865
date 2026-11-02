import { QueryClient } from '@tanstack/react-query';

/**
 * Caché de los datos del servidor (TanStack Query, D51). Es única para toda la app para poder
 * vaciarla al cerrar sesión (CA4). Las opciones por pantalla se fijan en cada feature.
 * Un solo reintento: sin conexión, el estado de error aparece en ~1 s y no en ~7 s (3 reintentos).
 */
export const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});
