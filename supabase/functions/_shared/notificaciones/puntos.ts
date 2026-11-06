import { z } from 'zod';

import { enviarMensajes } from './envio.ts';
import type { EnviarAExpo, MensajeExpo } from './expo.ts';
import type { ParAviso } from './recordatorios.ts';

// F11b: aviso de puntos listos, uno por partido y usuario (R3), a todos sus dispositivos. La
// selección la hace el servidor (`avisos_puntos_pendientes`, R1–R2); el envío es el de F11a (R5).

export const TITULO_PUNTOS = 'Tus puntos están listos';
export const CANAL_PUNTOS = 'puntos';

// La función SQL devuelve tipos sin nulos en los tipos generados, pero `puntos_bono` puede venir
// vacío y `estado_bono` es texto: se validan con Zod (D54).
const esquemaPendiente = z.object({
  usuario_id: z.string(),
  partido_id: z.int(),
  local: z.string(),
  visitante: z.string(),
  goles_local: z.int(),
  goles_visitante: z.int(),
  es_simulado: z.boolean(),
  puntos_base: z.int(),
  estado_bono: z.enum(['SIN_JUSTIFICACION', 'PENDIENTE', 'EVALUADA', 'ERROR']),
  puntos_bono: z.int().nullable(),
  tokens: z.array(z.string()),
});

export type AvisoPuntosPendiente = z.infer<typeof esquemaPendiente>;

export type DependenciasAvisosPuntos = {
  ahora: () => Date;
  buscarPendientes: (ahora: Date) => Promise<unknown[]>;
  /** Escribe `notificacion_enviada` y devuelve solo los pares que no existían (R3). */
  reclamarAvisos: (pares: readonly ParAviso[]) => Promise<ParAviso[]>;
  enviarAExpo: EnviarAExpo;
  borrarTokens: (tokens: readonly string[]) => Promise<void>;
};

export type ResumenAvisosPuntos = {
  avisos: number;
  mensajes: number;
  enviados: number;
  fallidos: number;
  tokensBorrados: number;
  errores: string[];
};

/** R4 (los números vienen del servidor). Lo simulado se marca en el título (R08). */
export function tituloAvisoPuntos(aviso: Pick<AvisoPuntosPendiente, 'es_simulado'>): string {
  return aviso.es_simulado ? `${TITULO_PUNTOS} · Simulado` : TITULO_PUNTOS;
}

/** R4: "Puebla 2-1 Querétaro: ganaste 250 puntos + 60 de bono." y sus variantes. */
export function cuerpoAvisoPuntos(aviso: AvisoPuntosPendiente): string {
  const partido = `${aviso.local} ${aviso.goles_local}-${aviso.goles_visitante} ${aviso.visitante}`;
  const base = aviso.puntos_base;
  if (aviso.estado_bono === 'PENDIENTE') {
    return base > 0
      ? `${partido}: ganaste ${base} puntos; tu bono sigue en revisión.`
      : `${partido}: sin puntos base; tu bono sigue en revisión.`;
  }
  const bono = aviso.estado_bono === 'EVALUADA' ? (aviso.puntos_bono ?? 0) : 0;
  if (base === 0 && bono === 0) return `${partido}: esta vez no sumaste puntos.`;
  if (aviso.estado_bono === 'EVALUADA') {
    return base > 0
      ? `${partido}: ganaste ${base} puntos + ${bono} de bono.`
      : `${partido}: sin puntos base + ${bono} de bono.`;
  }
  return `${partido}: ganaste ${base} puntos.`;
}

function mensajesDe(aviso: AvisoPuntosPendiente): MensajeExpo[] {
  return aviso.tokens.map((to) => ({
    to,
    title: tituloAvisoPuntos(aviso),
    body: cuerpoAvisoPuntos(aviso),
    data: { ruta: `/partido/${aviso.partido_id}` },
    channelId: CANAL_PUNTOS,
    sound: 'default',
    priority: 'high',
  }));
}

/** Lee los listos, reclama los avisos (si ya estaban escritos no se mandan) y los envía. */
export async function ejecutarAvisosPuntos(
  dependencias: DependenciasAvisosPuntos,
): Promise<ResumenAvisosPuntos> {
  const resumen: ResumenAvisosPuntos = {
    avisos: 0,
    mensajes: 0,
    enviados: 0,
    fallidos: 0,
    tokensBorrados: 0,
    errores: [],
  };

  const pendientes: AvisoPuntosPendiente[] = [];
  for (const fila of await dependencias.buscarPendientes(dependencias.ahora())) {
    const aviso = esquemaPendiente.safeParse(fila);
    if (aviso.success) pendientes.push(aviso.data);
    else resumen.errores.push(`Aviso con forma inválida: ${z.prettifyError(aviso.error)}`);
  }
  if (pendientes.length === 0) return resumen;

  const reclamados = await dependencias.reclamarAvisos(
    pendientes.map(({ usuario_id, partido_id }) => ({ usuario_id, partido_id })),
  );
  const clave = (p: ParAviso) => `${p.usuario_id}:${p.partido_id}`;
  const nuevos = new Set(reclamados.map(clave));
  const avisos = pendientes.filter((p) => nuevos.has(clave(p)));
  const mensajes = avisos.flatMap(mensajesDe);
  resumen.avisos = avisos.length;
  resumen.mensajes = mensajes.length;

  const envio = await enviarMensajes(mensajes, dependencias.enviarAExpo, dependencias.borrarTokens);
  resumen.enviados = envio.enviados;
  resumen.fallidos = envio.fallidos;
  resumen.tokensBorrados = envio.tokensBorrados;
  resumen.errores.push(...envio.errores);
  return resumen;
}
