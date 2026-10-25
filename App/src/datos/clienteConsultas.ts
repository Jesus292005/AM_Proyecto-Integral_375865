import { QueryClient } from '@tanstack/react-query';

/**
 * Caché de los datos del servidor (TanStack Query, D51). Es única para toda la app para poder
 * vaciarla al cerrar sesión (CA4). Las opciones por pantalla se fijan en cada feature.
 */
export const clienteConsultas = new QueryClient();
