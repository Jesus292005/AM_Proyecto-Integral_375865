import { z } from 'zod';

import { comoErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import type { InsigniaDeVitrina, MiCarta, MiRacha } from './datos';

// S13, perfil de otro usuario (F19 R6): solo para quien comparte grupo con esa persona (R1). El
// servidor lo comprueba y da el mismo `NO_ENCONTRADO` si no existe o no compartimos grupo.

const entero = z.number().int();
const atributo = entero.nullable();
const esquemaNivel = z.enum(['BRONCE', 'PLATA', 'ORO']);

const esquemaPerfil = z.object({
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  es_yo: z.boolean(),
  equipo_nombre_corto: z.string().nullable(),
  equipo_escudo_url: z.string().nullable(),
  equipo_color_primario: z.string().nullable(),
  equipo_color_texto: z.string().nullable(),
  racha_actual: entero,
  mejor_racha: entero,
  racha_incluye_simulados: z.boolean(),
  ultima_calificacion: z.string().nullable(),
  calificadas: entero,
  precision: atributo,
  punteria: atributo,
  analisis: atributo,
  constancia: atributo,
  media: atributo,
  nivel: esquemaNivel.nullable(),
  carta_incluye_simulados: z.boolean(),
});

const esquemaInsignia = z.object({
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  nivel: esquemaNivel,
  icono: z.string(),
  repetible: z.boolean(),
  orden: entero,
  veces: entero,
  ultima_en: z.string().nullable(),
  ultima_simulada: z.boolean().nullable(),
});

export type PerfilDeUsuario = {
  usuarioId: string;
  nombre: string;
  foto_url: string | null;
  esYo: boolean;
  equipo: { nombre_corto: string; escudo_url: string; color_primario: string | null; color_texto: string | null } | null;
  racha: MiRacha;
  carta: MiCarta;
};

/** El usuario no existe o no comparte grupo conmigo (F19 R1). */
export class ErrorPerfilNoEncontrado extends Error {
  constructor() {
    super('NO_ENCONTRADO');
    this.name = 'ErrorPerfilNoEncontrado';
  }
}

function validar<T>(esquema: z.ZodType<T>, datos: unknown, que: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw new Error(`${que} con forma inválida: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

function comoError(error: { message: string }, status: number): Error {
  return error.message === 'NO_ENCONTRADO' ? new ErrorPerfilNoEncontrado() : comoErrorDatos(error, status);
}

/** Encabezado, racha y carta de esa persona, con las mismas fórmulas que las mías (F19 R5, R6). */
export async function obtenerPerfilDe(usuarioId: string): Promise<PerfilDeUsuario> {
  const { data, error, status } = await supabase.rpc('perfil_usuario', { id_usuario: usuarioId });
  if (error) throw comoError(error, status);
  const [f] = validar(z.array(esquemaPerfil).length(1), data, 'Perfil de usuario');
  if (f === undefined) throw new ErrorPerfilNoEncontrado();
  return {
    usuarioId: f.usuario_id,
    nombre: f.nombre,
    foto_url: f.foto_url,
    esYo: f.es_yo,
    equipo:
      f.equipo_nombre_corto !== null && f.equipo_escudo_url !== null
        ? {
            nombre_corto: f.equipo_nombre_corto,
            escudo_url: f.equipo_escudo_url,
            color_primario: f.equipo_color_primario,
            color_texto: f.equipo_color_texto,
          }
        : null,
    racha: {
      racha_actual: f.racha_actual,
      mejor_racha: f.mejor_racha,
      incluye_simulados: f.racha_incluye_simulados,
      ultima_calificacion: f.ultima_calificacion,
    },
    carta: {
      calificadas: f.calificadas,
      precision: f.precision,
      punteria: f.punteria,
      analisis: f.analisis,
      constancia: f.constancia,
      media: f.media,
      nivel: f.nivel,
      incluye_simulados: f.carta_incluye_simulados,
    },
  };
}

/** Su Vitrina: el catálogo con cuántas veces y cuándo, sin grupo ni jornada (decisión 5). */
export async function obtenerInsigniasDe(usuarioId: string): Promise<InsigniaDeVitrina[]> {
  const { data, error, status } = await supabase.rpc('insignias_usuario', { id_usuario: usuarioId });
  if (error) throw comoError(error, status);
  return validar(z.array(esquemaInsignia), data, 'Insignias de usuario').map((i) => ({
    ...i,
    // Nunca "nueva" (F14 R7 es solo para las propias) ni dónde se ganó.
    nueva: false,
    ultimo_grupo: null,
    ultima_jornada: null,
  }));
}
