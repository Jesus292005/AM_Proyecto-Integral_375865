import type { PrediccionACalificar } from '../calificacion/puntos.ts';
import type { Enums } from '../tipos-db.ts';
import { armarPeticion, interpretarRespuesta, type LlamarAnthropic, MODELO_IA, type Tokens } from './anthropic.ts';
import { aplicarEvidencia, calcularBono } from './bono.ts';
import type { DatosPartidoIA } from './datos.ts';
import type { Afirmacion } from './esquema.ts';
import { mensajeUsuario, SISTEMA, VERSION_PROMPT } from './prompt.ts';

// F06 Flujo 3: toma las evaluaciones pendientes, llama a la IA, valida, aplica la evidencia (R7) y
// la rúbrica (R3) y guarda; si falla, reprograma o deja ERROR (R8). Los topes de R10 se revisan
// antes de tomar nada. Las llamadas son de una en una para no pasar el límite de la API.

export const EVALUACIONES_POR_EJECUCION = 5;
export const LLAMADAS_POR_DIA = 150;
/**
 * Después de este tiempo no se empieza otra llamada: las que faltan se liberan sin gastar intento.
 * Con el tiempo límite de 30 s por llamada, la función termina antes de los 150 s de una Edge
 * Function del plan gratis.
 */
export const TIEMPO_MAXIMO_MS = 90_000;

export type Tomada = { evaluacion_id: number; prediccion_id: number; partido_id: number; intentos: number };

export type PrediccionConJustificacion = PrediccionACalificar & { justificacion: string | null };

export type EvaluacionGuardada = {
  puntos_bono: number;
  explicacion: string;
  afirmaciones: Afirmacion[];
  modelo: string;
  version_prompt: string;
};

export type RegistroLlamada = {
  evaluacion_id: number;
  modelo: string;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  resultado: 'OK' | 'FALLO';
  detalle: string | null;
};

export type DependenciasEvaluar = {
  ahora: () => Date;
  llamadasHoy: (ahora: Date) => Promise<number>;
  tomar: (limite: number) => Promise<Tomada[]>;
  leerPrediccion: (prediccionId: number) => Promise<PrediccionConJustificacion>;
  leerDatosPartido: (partidoId: number) => Promise<DatosPartidoIA>;
  llamarIA: LlamarAnthropic;
  registrarLlamada: (registro: RegistroLlamada) => Promise<void>;
  /** `false` si ya no estaba pendiente (otra ejecución la cerró). */
  guardar: (evaluacionId: number, evaluacion: EvaluacionGuardada) => Promise<boolean>;
  registrarFallo: (evaluacionId: number, motivo: string) => Promise<Enums<'estado_evaluacion'> | null>;
  liberar: (evaluacionIds: number[]) => Promise<void>;
};

export type ResumenEvaluar = {
  evaluadas: number;
  reintentos: number;
  conError: number;
  llamadas: number;
  tokens: Tokens;
  topeDiario: boolean;
  sinClave: boolean;
  /** Reservadas que se devolvieron sin evaluar por falta de tiempo. */
  liberadasPorTiempo: number;
  errores: string[];
};

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function ejecutarEvaluaciones(dependencias: DependenciasEvaluar): Promise<ResumenEvaluar> {
  const resumen: ResumenEvaluar = {
    evaluadas: 0,
    reintentos: 0,
    conError: 0,
    llamadas: 0,
    tokens: { entrada: 0, salida: 0 },
    topeDiario: false,
    sinClave: false,
    liberadasPorTiempo: 0,
    errores: [],
  };

  const inicio = dependencias.ahora().getTime();
  const disponibles = LLAMADAS_POR_DIA - await dependencias.llamadasHoy(dependencias.ahora());
  if (disponibles <= 0) {
    resumen.topeDiario = true;
    return resumen;
  }
  const tomadas = await dependencias.tomar(Math.min(EVALUACIONES_POR_EJECUCION, disponibles));
  const partidos = new Map<number, Promise<DatosPartidoIA>>();

  const fallo = async (tomada: Tomada, motivo: string) => {
    resumen.errores.push(`Evaluación ${tomada.evaluacion_id}: ${motivo}`);
    const estado = await dependencias.registrarFallo(tomada.evaluacion_id, motivo);
    if (estado === 'ERROR') resumen.conError += 1;
    else if (estado === 'PENDIENTE') resumen.reintentos += 1;
  };

  for (const [i, tomada] of tomadas.entries()) {
    if (dependencias.ahora().getTime() - inicio > TIEMPO_MAXIMO_MS) {
      const restantes = tomadas.slice(i).map((t) => t.evaluacion_id);
      await dependencias.liberar(restantes);
      resumen.liberadasPorTiempo = restantes.length;
      break;
    }
    try {
      const prediccion = await dependencias.leerPrediccion(tomada.prediccion_id);
      if (prediccion.justificacion === null) {
        await fallo(tomada, 'La predicción ya no tiene justificación.');
        continue;
      }
      let datos = partidos.get(tomada.partido_id);
      if (datos === undefined) {
        datos = dependencias.leerDatosPartido(tomada.partido_id);
        partidos.set(tomada.partido_id, datos);
      }
      const { texto, ids } = mensajeUsuario(await datos, prediccion, prediccion.justificacion);

      const respuesta = await dependencias.llamarIA(armarPeticion(MODELO_IA, SISTEMA, texto));
      resumen.llamadas += 1;

      if (respuesta.tipo === 'error') {
        await dependencias.registrarLlamada({
          evaluacion_id: tomada.evaluacion_id,
          modelo: MODELO_IA,
          tokens_entrada: null,
          tokens_salida: null,
          resultado: 'FALLO',
          detalle: respuesta.mensaje.slice(0, 500),
        });
        // R8: una clave inválida no gasta intentos; se detiene todo y se reintenta más tarde.
        if (respuesta.estado === 401 || respuesta.estado === 403) {
          resumen.sinClave = true;
          resumen.errores.push(`SIN_CLAVE: ${respuesta.mensaje}`);
          await dependencias.liberar(tomadas.slice(i).map((t) => t.evaluacion_id));
          break;
        }
        await fallo(tomada, respuesta.mensaje);
        continue;
      }

      const resultado = interpretarRespuesta(respuesta.cuerpo);
      if (resultado.tokens) {
        resumen.tokens.entrada += resultado.tokens.entrada;
        resumen.tokens.salida += resultado.tokens.salida;
      }
      await dependencias.registrarLlamada({
        evaluacion_id: tomada.evaluacion_id,
        modelo: MODELO_IA,
        tokens_entrada: resultado.tokens?.entrada ?? null,
        tokens_salida: resultado.tokens?.salida ?? null,
        resultado: resultado.tipo === 'ok' ? 'OK' : 'FALLO',
        detalle: resultado.tipo === 'ok' ? null : resultado.motivo.slice(0, 500),
      });
      if (resultado.tipo === 'fallo') {
        await fallo(tomada, resultado.motivo);
        continue;
      }

      const afirmaciones = aplicarEvidencia(resultado.salida.afirmaciones, ids);
      const guardada = await dependencias.guardar(tomada.evaluacion_id, {
        puntos_bono: calcularBono(afirmaciones),
        explicacion: resultado.salida.explicacion,
        afirmaciones,
        modelo: MODELO_IA,
        version_prompt: VERSION_PROMPT,
      });
      if (guardada) resumen.evaluadas += 1;
    } catch (error) {
      // Falla de la base o datos del partido inutilizables: intento fallido con su motivo (R8). Si
      // tampoco se puede registrar, queda reservada y se reintenta cuando venza la reserva (R11).
      try {
        await fallo(tomada, mensajeDe(error));
      } catch (otro) {
        resumen.errores.push(`Evaluación ${tomada.evaluacion_id}: ${mensajeDe(otro)}`);
      }
    }
  }
  return resumen;
}
