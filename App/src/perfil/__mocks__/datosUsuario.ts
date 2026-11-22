// Se activa con `jest.mock('<ruta>/perfil/datosUsuario')`. Por defecto, un compañero sin equipo,
// sin racha, con la carta bloqueada y sin insignias.
import type { InsigniaDeVitrina } from '../datos';
import type { PerfilDeUsuario } from '../datosUsuario';

export class ErrorPerfilNoEncontrado extends Error {
  constructor() {
    super('NO_ENCONTRADO');
    this.name = 'ErrorPerfilNoEncontrado';
  }
}

export const perfilDeUsuarioDePrueba = (cambios: Partial<PerfilDeUsuario> = {}): PerfilDeUsuario => ({
  usuarioId: 'u5',
  nombre: 'Ana',
  foto_url: null,
  esYo: false,
  equipo: null,
  racha: { racha_actual: 0, mejor_racha: 0, incluye_simulados: false, ultima_calificacion: null },
  carta: {
    calificadas: 0,
    precision: null,
    punteria: null,
    analisis: null,
    constancia: null,
    media: null,
    nivel: null,
    incluye_simulados: false,
  },
  ...cambios,
});

export const obtenerPerfilDe = jest.fn(async (_usuarioId: string): Promise<PerfilDeUsuario> => perfilDeUsuarioDePrueba());
export const obtenerInsigniasDe = jest.fn(async (_usuarioId: string): Promise<InsigniaDeVitrina[]> => []);
