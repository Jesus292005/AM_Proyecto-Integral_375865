// Se activa con `jest.mock('<ruta>/perfil/datos')`. Por defecto la cuenta es de usuario normal, sin
// foto ni equipo favorito, con los recordatorios activos y sin racha.
import type { EquipoFavorito, MiPerfil, MiRacha, Rol } from '../datos';

export const obtenerMiRol = jest.fn(async (): Promise<Rol> => 'USUARIO');
export const obtenerRecordatoriosActivos = jest.fn(async () => true);
export const guardarRecordatoriosActivos = jest.fn(async (_activos: boolean) => {});
export const obtenerMiRacha = jest.fn(
  async (): Promise<MiRacha> => ({
    racha_actual: 0,
    mejor_racha: 0,
    incluye_simulados: false,
    ultima_calificacion: null,
  }),
);

export const perfilDePrueba = (cambios: Partial<MiPerfil> = {}): MiPerfil => ({
  nombre: 'Usuario de Prueba',
  foto_url: null,
  rol: 'USUARIO',
  equipo: null,
  ...cambios,
});
export const obtenerMiPerfil = jest.fn(async (): Promise<MiPerfil> => perfilDePrueba());

export const equiposDePrueba: EquipoFavorito[] = [
  { id: 1, nombre_corto: 'América', escudo_url: 'https://x.mx/1.png', color_primario: '#FFD100', color_texto: '#0B2341' },
  { id: 2, nombre_corto: 'Chivas', escudo_url: 'https://x.mx/2.png', color_primario: '#CD1F2D', color_texto: '#FFFFFF' },
  { id: 3, nombre_corto: 'Pumas', escudo_url: 'https://x.mx/3.png', color_primario: null, color_texto: null },
];
export const obtenerEquiposTorneoActual = jest.fn(async (): Promise<EquipoFavorito[]> => equiposDePrueba);
export const guardarEquipoFavorito = jest.fn(async (_equipoId: number | null) => {});

export class ErrorNombreInvalido extends Error {
  constructor() {
    super('NOMBRE_INVALIDO');
    this.name = 'ErrorNombreInvalido';
  }
}
export const cambiarMiNombre = jest.fn(async (nombre: string) => nombre.trim());
