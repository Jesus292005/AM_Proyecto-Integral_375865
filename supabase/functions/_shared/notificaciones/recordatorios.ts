import { z } from 'zod';

import type { Database } from '../tipos-db.ts';
import {
  type EnviarAExpo,
  esquemaRespuestaExpo,
  MENSAJES_POR_PETICION,
  type MensajeExpo,
} from './expo.ts';

// F11a: recordatorio 1 h antes del cierre a quien no ha predicho (R5, decisión 4 de D90). Un aviso
// por usuario y ejecución que agrupa sus partidos, a todos sus dispositivos (R6).

export type Pendiente =
  Database['public']['Functions']['recordatorios_pendientes']['Returns'][number];

export type ParAviso = { usuario_id: string; partido_id: number };

export type DependenciasRecordatorios = {
  ahora: () => Date;
  buscarPendientes: (ahora: Date) => Promise<Pendiente[]>;
  /** Escribe `notificacion_enviada` y devuelve solo los pares que no existían (R6). */
  reclamarAvisos: (pares: readonly ParAviso[]) => Promise<ParAviso[]>;
  enviarAExpo: EnviarAExpo;
  borrarTokens: (tokens: readonly string[]) => Promise<void>;
};

export type Aviso = {
  usuarioId: string;
  partidos: number[];
  tokens: string[];
  titulo: string;
  cuerpo: string;
  ruta: string;
};

export type ResumenRecordatorios = {
  avisos: number;
  mensajes: number;
  enviados: number;
  fallidos: number;
  tokensBorrados: number;
  errores: string[];
};

// R8 y R9.
export const TITULO_RECORDATORIO = 'Cierra en menos de 1 h';
export const CANAL_RECORDATORIOS = 'recordatorios';

/** "América vs Pumas: aún no lo predices." / "… y 2 partidos más: aún no los predices." (R8) */
export function cuerpoAviso(partidos: readonly Pick<Pendiente, 'local' | 'visitante'>[]): string {
  const [primero] = partidos;
  if (primero === undefined) throw new Error('Un aviso necesita al menos un partido.');
  const nombre = `${primero.local} vs ${primero.visitante}`;
  const resto = partidos.length - 1;
  if (resto === 0) return `${nombre}: aún no lo predices.`;
  return `${nombre} y ${resto} ${resto === 1 ? 'partido' : 'partidos'} más: aún no los predices.`;
}

/**
 * Un aviso por usuario, con sus partidos en orden de cierre. Un partido abre su S03; varios, S02 de
 * la jornada del que cierra primero (02-navigation §4).
 */
export function agruparAvisos(pendientes: readonly Pendiente[]): Aviso[] {
  const porUsuario = Map.groupBy(pendientes, (p) => p.usuario_id);
  return [...porUsuario].map(([usuarioId, propios]) => {
    const ordenados = propios.toSorted(
      (a, b) =>
        Date.parse(a.cierre_predicciones) - Date.parse(b.cierre_predicciones) ||
        a.partido_id - b.partido_id,
    );
    const primero = ordenados[0];
    if (primero === undefined) throw new Error('Grupo vacío');
    return {
      usuarioId,
      partidos: ordenados.map((p) => p.partido_id),
      tokens: primero.tokens,
      titulo: TITULO_RECORDATORIO,
      cuerpo: cuerpoAviso(ordenados),
      ruta: ordenados.length === 1
        ? `/partido/${primero.partido_id}`
        : `/partidos?jornada=${primero.jornada_orden}`,
    };
  });
}

function mensajesDe(aviso: Aviso): MensajeExpo[] {
  return aviso.tokens.map((to) => ({
    to,
    title: aviso.titulo,
    body: aviso.cuerpo,
    data: { ruta: aviso.ruta },
    channelId: CANAL_RECORDATORIOS,
    sound: 'default',
    priority: 'high',
  }));
}

/**
 * Lee los pendientes, reclama los avisos (si ya estaban escritos no se mandan) y los envía en
 * bloques de 100. Un ticket `DeviceNotRegistered` borra su token. Un envío fallido no se reintenta:
 * ese recordatorio se pierde y queda en el resumen (R6).
 */
export async function ejecutarRecordatorios(
  dependencias: DependenciasRecordatorios,
): Promise<ResumenRecordatorios> {
  const resumen: ResumenRecordatorios = {
    avisos: 0,
    mensajes: 0,
    enviados: 0,
    fallidos: 0,
    tokensBorrados: 0,
    errores: [],
  };

  const pendientes = await dependencias.buscarPendientes(dependencias.ahora());
  if (pendientes.length === 0) return resumen;

  const reclamados = await dependencias.reclamarAvisos(
    pendientes.map(({ usuario_id, partido_id }) => ({ usuario_id, partido_id })),
  );
  const clave = (p: ParAviso) => `${p.usuario_id}:${p.partido_id}`;
  const nuevos = new Set(reclamados.map(clave));
  const avisos = agruparAvisos(pendientes.filter((p) => nuevos.has(clave(p))));
  const mensajes = avisos.flatMap(mensajesDe);
  resumen.avisos = avisos.length;
  resumen.mensajes = mensajes.length;

  const noRegistrados: string[] = [];
  for (let i = 0; i < mensajes.length; i += MENSAJES_POR_PETICION) {
    const bloque = mensajes.slice(i, i + MENSAJES_POR_PETICION);
    const respuesta = await dependencias.enviarAExpo(bloque);
    if (respuesta.tipo === 'error') {
      resumen.fallidos += bloque.length;
      resumen.errores.push(respuesta.mensaje);
      continue;
    }
    const tickets = esquemaRespuestaExpo.safeParse(respuesta.cuerpo);
    if (!tickets.success || tickets.data.data.length !== bloque.length) {
      resumen.fallidos += bloque.length;
      resumen.errores.push(
        tickets.success
          ? `Expo devolvió ${tickets.data.data.length} tickets para ${bloque.length} mensajes`
          : `Respuesta de Expo con forma inválida: ${z.prettifyError(tickets.error)}`,
      );
      continue;
    }
    tickets.data.data.forEach((ticket, j) => {
      if (ticket.status === 'ok') {
        resumen.enviados += 1;
        return;
      }
      resumen.fallidos += 1;
      resumen.errores.push(ticket.message);
      const mensaje = bloque[j];
      if (ticket.details?.error === 'DeviceNotRegistered' && mensaje) noRegistrados.push(mensaje.to);
    });
  }

  if (noRegistrados.length > 0) {
    await dependencias.borrarTokens(noRegistrados);
    resumen.tokensBorrados = noRegistrados.length;
  }
  return resumen;
}
