import { supabase } from '../supabase/cliente';
import { ErrorDatos } from '../datos/errores';
import { ErrorPerfilNoEncontrado, obtenerInsigniasDe, obtenerPerfilDe } from './datosUsuario';

jest.mock('../supabase/cliente', () => ({ supabase: { rpc: jest.fn() } }));

const rpc = supabase.rpc as unknown as jest.Mock;
const ID = '00000000-0000-0000-0000-0000000000a5';

const filaPerfil = {
  usuario_id: ID,
  nombre: 'Ana',
  foto_url: null,
  es_yo: false,
  equipo_nombre_corto: 'Pumas',
  equipo_escudo_url: 'https://x.mx/3.png',
  equipo_color_primario: null,
  equipo_color_texto: null,
  racha_actual: 3,
  mejor_racha: 5,
  racha_incluye_simulados: true,
  ultima_calificacion: '2026-11-20T20:00:00Z',
  calificadas: 8,
  precision: 77,
  punteria: 60,
  analisis: null,
  constancia: 70,
  media: 69,
  nivel: 'PLATA',
  carta_incluye_simulados: false,
};

beforeEach(() => rpc.mockReset());

describe('perfil de otro usuario (F19 R6)', () => {
  it('F19 CA4: una llamada a perfil_usuario arma encabezado, racha y carta', async () => {
    rpc.mockResolvedValue({ data: [filaPerfil], error: null, status: 200 });

    expect(await obtenerPerfilDe(ID)).toEqual({
      usuarioId: ID,
      nombre: 'Ana',
      foto_url: null,
      esYo: false,
      equipo: { nombre_corto: 'Pumas', escudo_url: 'https://x.mx/3.png', color_primario: null, color_texto: null },
      racha: { racha_actual: 3, mejor_racha: 5, incluye_simulados: true, ultima_calificacion: '2026-11-20T20:00:00Z' },
      carta: {
        calificadas: 8,
        precision: 77,
        punteria: 60,
        analisis: null,
        constancia: 70,
        media: 69,
        nivel: 'PLATA',
        incluye_simulados: false,
      },
    });
    expect(rpc).toHaveBeenCalledWith('perfil_usuario', { id_usuario: ID });
  });

  it('F19 CA4: sin equipo, `equipo` es null', async () => {
    rpc.mockResolvedValue({
      data: [{ ...filaPerfil, equipo_nombre_corto: null, equipo_escudo_url: null }],
      error: null,
      status: 200,
    });

    expect((await obtenerPerfilDe(ID)).equipo).toBeNull();
  });

  it('F19 CA5: NO_ENCONTRADO del servidor es ErrorPerfilNoEncontrado; otra falla, error de datos', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'NO_ENCONTRADO' }, status: 400 });
    await expect(obtenerPerfilDe(ID)).rejects.toBeInstanceOf(ErrorPerfilNoEncontrado);
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'NO_ENCONTRADO' }, status: 400 });
    await expect(obtenerInsigniasDe(ID)).rejects.toBeInstanceOf(ErrorPerfilNoEncontrado);
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' }, status: 500 });
    await expect(obtenerPerfilDe(ID)).rejects.toBeInstanceOf(ErrorDatos);
  });

  it('F19 CA4 (decisión 5): las insignias de otro nunca son "nuevas" ni dicen grupo o jornada', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          codigo: 'TOP_JORNADA',
          nombre: 'Top de la jornada',
          descripcion: 'Queda 1.º',
          nivel: 'ORO',
          icono: 'trofeo',
          repetible: true,
          orden: 6,
          veces: 2,
          ultima_en: '2026-11-20T20:00:00Z',
          ultima_simulada: false,
          // Aunque el servidor mandara de más, la app no lo usa.
          nueva: true,
          ultimo_grupo: 'Grupo ajeno',
          ultima_jornada: 'Jornada 3',
        },
      ],
      error: null,
      status: 200,
    });

    const [insignia] = await obtenerInsigniasDe(ID);
    expect(rpc).toHaveBeenCalledWith('insignias_usuario', { id_usuario: ID });
    expect(insignia).toMatchObject({ codigo: 'TOP_JORNADA', veces: 2, nueva: false, ultimo_grupo: null, ultima_jornada: null });
  });
});
