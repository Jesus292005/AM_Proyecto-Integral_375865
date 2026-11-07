// Se activa con `jest.mock('<ruta>/grupos/datos')`. Por defecto no estoy en ningún grupo; cada
// prueba puede cambiar las respuestas.
import type { GrupoDetalle, Miembro, MiGrupo, PrediccionAjena, Union } from '../datos';

export const obtenerMisGrupos = jest.fn(async (): Promise<MiGrupo[]> => []);
export const obtenerGrupo = jest.fn(
  async (grupoId: number): Promise<GrupoDetalle | null> => ({
    id: grupoId,
    nombre: 'Los del sillón',
    codigo_invitacion: 'ABCDEFGH',
  }),
);
export const obtenerMiembros = jest.fn(async (_grupoId: number): Promise<Miembro[]> => []);
export const obtenerPrediccionesDelGrupo = jest.fn(
  async (_partidoId: number): Promise<PrediccionAjena[]> => [],
);
export const crearGrupo = jest.fn(async (_nombre: string): Promise<number> => 1);
export const unirseAGrupo = jest.fn(
  async (_codigo: string): Promise<Union> => ({ grupoId: 1, yaEraMiembro: false }),
);
export const salirDeGrupo = jest.fn(async (_grupoId: number): Promise<void> => {});
