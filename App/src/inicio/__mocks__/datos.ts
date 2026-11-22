// Se activa con `jest.mock('<ruta>/inicio/datos')`. Por defecto no hay nada pendiente, ni equipo,
// ni jornada calificada, ni mejor análisis; cada prueba puede cambiar las respuestas.
import type { MejorAnalisis, Pendiente, ProximoPartido, UltimaJornada } from '../datos';

export { ErrorDatos } from '../../datos/errores';

const local = { nombre_corto: 'América', escudo_url: 'https://x.mx/1.png', color_primario: '#FFD100', color_texto: '#0B2341' };
const visitante = { nombre_corto: 'Chivas', escudo_url: 'https://x.mx/2.png', color_primario: '#CD1F2D', color_texto: '#FFFFFF' };

export const pendienteDePrueba = (cambios: Partial<Pendiente> = {}): Pendiente => ({
  id: 7,
  jornada: { id: 10, orden: 10, nombre: 'Jornada 10' },
  inicio: '2026-11-28T03:00:00Z',
  cierre_predicciones: '2026-11-28T03:00:00Z',
  estado: 'PROGRAMADO',
  es_simulado: false,
  local,
  visitante,
  ...cambios,
});

export const proximoDePrueba = (cambios: Partial<ProximoPartido> = {}): ProximoPartido => ({
  id: 8,
  jornada: { id: 10, orden: 10, nombre: 'Jornada 10' },
  inicio: '2026-11-29T03:00:00Z',
  cierre_predicciones: '2026-11-29T03:00:00Z',
  estado: 'PROGRAMADO',
  tengo_prediccion: false,
  local,
  visitante,
  ...cambios,
});

export const ultimaJornadaDePrueba = (cambios: Partial<UltimaJornada> = {}): UltimaJornada => ({
  jornada_id: 9,
  jornada_orden: 9,
  jornada_nombre: 'Jornada 9',
  en_curso: false,
  predicciones_calificadas: 3,
  puntos_base: 450,
  puntos_bono: 70,
  puntos_total: 520,
  bonos_pendientes: 0,
  mejor_analisis_partido_id: 5,
  mejor_analisis_bono: 70,
  incluye_simulados: false,
  ...cambios,
});

export const mejorAnalisisDePrueba = (cambios: Partial<MejorAnalisis> = {}): MejorAnalisis => ({
  partido_id: 5,
  goles_local: 2,
  goles_visitante: 1,
  usuario_id: 'usuario-2',
  nombre: 'Pepe',
  foto_url: null,
  es_yo: false,
  justificacion: 'El América llega con 4 victorias seguidas en casa.',
  puntos_bono: 82,
  explicacion: 'Citó la racha en casa y acertó.',
  grupo_id: 1,
  grupo_nombre: 'Los del sillón',
  jornada_id: 9,
  jornada_nombre: 'Jornada 9',
  en_curso: false,
  es_simulada: false,
  local,
  visitante,
  ...cambios,
});

export const obtenerPendientes = jest.fn(async (): Promise<Pendiente[]> => []);
export const obtenerProximoPartidoEquipo = jest.fn(async (): Promise<ProximoPartido | null> => null);
export const obtenerMiUltimaJornada = jest.fn(async (): Promise<UltimaJornada | null> => null);
export const obtenerMejorAnalisis = jest.fn(async (): Promise<MejorAnalisis | null> => null);
export const obtenerAnalistaDeJornada = jest.fn(
  async (_grupoId: number, _jornadaId: number): Promise<MejorAnalisis | null> => null,
);
