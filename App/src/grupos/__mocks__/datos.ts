// Se activa con `jest.mock('<ruta>/grupos/datos')`. Por defecto no estoy en ningún grupo; cada
// prueba puede cambiar las respuestas.
import type {
  AnalisisDelMuro,
  Faltan,
  GrupoDetalle,
  MiembroConRol,
  MiGrupo,
  PrediccionAjena,
  Ranking,
  TipoReaccion,
  Union,
} from '../datos';

export const TIPOS_REACCION = ['BIEN_VISTO', 'BUEN_ANALISIS', 'LA_CLAVO', 'ME_RIO'] as const;

export const obtenerMisGrupos = jest.fn(async (): Promise<MiGrupo[]> => []);
export const obtenerGrupo = jest.fn(
  async (grupoId: number): Promise<GrupoDetalle | null> => ({
    id: grupoId,
    nombre: 'Los del sillón',
    codigo_invitacion: 'ABCDEFGH',
    color: 'AZUL',
    rol: 'MIEMBRO',
    miembros: 2,
  }),
);
export const obtenerRanking = jest.fn(
  async (_grupoId: number, _jornadaId: number | null): Promise<Ranking> => ({
    filas: [],
    incluyeSimulados: false,
  }),
);
export const obtenerPrediccionesDelGrupo = jest.fn(
  async (_partidoId: number): Promise<PrediccionAjena[]> => [],
);
export const crearGrupo = jest.fn(async (_nombre: string): Promise<number> => 1);
export const unirseAGrupo = jest.fn(
  async (_codigo: string): Promise<Union> => ({ grupoId: 1, yaEraMiembro: false }),
);
export const editarGrupo = jest.fn(
  async (_grupoId: number, _nombre: string, _color: string): Promise<void> => {},
);
export const salirDeGrupo = jest.fn(async (_grupoId: number): Promise<void> => {});
export const obtenerMuro = jest.fn(async (_grupoId: number, _jornadaId: number): Promise<AnalisisDelMuro[]> => []);
export const reaccionar = jest.fn(
  async (_grupoId: number, _prediccionId: number, _tipo: TipoReaccion | null): Promise<void> => {},
);
export const obtenerFaltan = jest.fn(
  async (_grupoId: number): Promise<Faltan> => ({ porMiembro: new Map(), abiertos: 0, jornada: 'Jornada 2' }),
);
export const obtenerRoles = jest.fn(async (_grupoId: number): Promise<MiembroConRol[]> => []);
