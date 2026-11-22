import { router } from 'expo-router';

/**
 * S03 desde un grupo (muro y figura de la jornada): su propia ruta dentro de la pestaña desde la que
 * se llegó, para que "atrás" vuelva al grupo (D76, D115). `/partido/:partidoId` es la de las
 * entradas externas (abre en Inicio).
 */
export function abrirPartidoDelGrupo(grupoId: number, partidoId: number) {
  router.navigate({
    pathname: '/grupo/[grupoId]/partido/[partidoId]',
    params: { grupoId: String(grupoId), partidoId: String(partidoId) },
  });
}
