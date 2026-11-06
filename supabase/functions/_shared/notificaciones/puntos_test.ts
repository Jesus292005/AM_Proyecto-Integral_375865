import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import type { MensajeExpo } from './expo.ts';
import {
  type AvisoPuntosPendiente,
  CANAL_PUNTOS,
  cuerpoAvisoPuntos,
  type DependenciasAvisosPuntos,
  ejecutarAvisosPuntos,
  tituloAvisoPuntos,
} from './puntos.ts';
import type { ParAviso } from './recordatorios.ts';

function aviso(extra: Partial<AvisoPuntosPendiente> = {}): AvisoPuntosPendiente {
  return {
    usuario_id: 'u1',
    partido_id: 7,
    local: 'Puebla',
    visitante: 'Querétaro',
    goles_local: 2,
    goles_visitante: 1,
    es_simulado: false,
    puntos_base: 250,
    estado_bono: 'SIN_JUSTIFICACION',
    puntos_bono: null,
    tokens: ['ExponentPushToken[a]'],
    ...extra,
  };
}

const casosTexto: [string, Partial<AvisoPuntosPendiente>, string][] = [
  ['base y bono evaluado', { estado_bono: 'EVALUADA', puntos_bono: 60 },
    'Puebla 2-1 Querétaro: ganaste 250 puntos + 60 de bono.'],
  ['sin justificación', {}, 'Puebla 2-1 Querétaro: ganaste 250 puntos.'],
  ['bono con error', { estado_bono: 'ERROR' }, 'Puebla 2-1 Querétaro: ganaste 250 puntos.'],
  ['bono aún pendiente (20 min)', { estado_bono: 'PENDIENTE' },
    'Puebla 2-1 Querétaro: ganaste 250 puntos; tu bono sigue en revisión.'],
  ['0 base y 0 bono', { puntos_base: 0, estado_bono: 'EVALUADA', puntos_bono: 0 },
    'Puebla 2-1 Querétaro: esta vez no sumaste puntos.'],
  ['0 base sin justificación', { puntos_base: 0 }, 'Puebla 2-1 Querétaro: esta vez no sumaste puntos.'],
  ['0 base con bono', { puntos_base: 0, estado_bono: 'EVALUADA', puntos_bono: 80 },
    'Puebla 2-1 Querétaro: sin puntos base + 80 de bono.'],
  ['0 base con bono pendiente', { puntos_base: 0, estado_bono: 'PENDIENTE' },
    'Puebla 2-1 Querétaro: sin puntos base; tu bono sigue en revisión.'],
];

for (const [nombre, extra, texto] of casosTexto) {
  Deno.test(`F11b CA2: texto con ${nombre}`, () => {
    equal(cuerpoAvisoPuntos(aviso(extra)), texto);
  });
}

Deno.test('F11b CA2: el título marca lo simulado (R08)', () => {
  equal(tituloAvisoPuntos(aviso()), 'Tus puntos están listos');
  equal(tituloAvisoPuntos(aviso({ es_simulado: true })), 'Tus puntos están listos · Simulado');
});

function dobles(pendientes: unknown[], yaAvisados: ParAviso[] = []) {
  const avisados = new Set(yaAvisados.map((p) => `${p.usuario_id}:${p.partido_id}`));
  const registro = { enviados: [] as MensajeExpo[], borrados: [] as string[] };
  const dependencias: DependenciasAvisosPuntos = {
    ahora: () => new Date('2026-11-06T20:00:00Z'),
    buscarPendientes: () => Promise.resolve(pendientes),
    reclamarAvisos: (pares) => {
      const nuevos = pares.filter((p) => !avisados.has(`${p.usuario_id}:${p.partido_id}`));
      for (const p of nuevos) avisados.add(`${p.usuario_id}:${p.partido_id}`);
      return Promise.resolve(nuevos);
    },
    enviarAExpo: (mensajes) => {
      registro.enviados.push(...mensajes);
      return Promise.resolve({
        tipo: 'ok',
        cuerpo: {
          data: mensajes.map((m) =>
            m.to === 'ExponentPushToken[viejo]'
              ? { status: 'error', message: 'no registrado', details: { error: 'DeviceNotRegistered' } }
              : { status: 'ok', id: `t-${m.to}` }
          ),
        },
      });
    },
    borrarTokens: (tokens) => {
      registro.borrados.push(...tokens);
      return Promise.resolve();
    },
  };
  return { dependencias, registro };
}

Deno.test('F11b CA3: un aviso por (usuario, partido) a cada dispositivo, con su ruta y canal', async () => {
  const { dependencias, registro } = dobles([
    aviso({ tokens: ['ExponentPushToken[a]', 'ExponentPushToken[b]'], estado_bono: 'EVALUADA', puntos_bono: 60 }),
    aviso({ partido_id: 8, local: 'América', visitante: 'Pumas', goles_local: 0, goles_visitante: 0 }),
  ]);
  const resumen = await ejecutarAvisosPuntos(dependencias);

  equal(resumen.avisos, 2);
  equal(resumen.mensajes, 3);
  equal(resumen.enviados, 3);
  deepStrictEqual(registro.enviados[0], {
    to: 'ExponentPushToken[a]',
    title: 'Tus puntos están listos',
    body: 'Puebla 2-1 Querétaro: ganaste 250 puntos + 60 de bono.',
    data: { ruta: '/partido/7' },
    channelId: CANAL_PUNTOS,
    sound: 'default',
    priority: 'high',
  });
  equal(registro.enviados[1]?.to, 'ExponentPushToken[b]');
  equal(registro.enviados[2]?.data.ruta, '/partido/8');
});

Deno.test('F11b CA3: una segunda ejecución no manda nada', async () => {
  const { dependencias, registro } = dobles([aviso()]);
  await ejecutarAvisosPuntos(dependencias);
  const segunda = await ejecutarAvisosPuntos(dependencias);
  equal(registro.enviados.length, 1);
  equal(segunda.avisos, 0);
  equal(segunda.mensajes, 0);
});

Deno.test('F11b CA3: un ticket DeviceNotRegistered borra ese token', async () => {
  const { dependencias, registro } = dobles([aviso({ tokens: ['ExponentPushToken[a]', 'ExponentPushToken[viejo]'] })]);
  const resumen = await ejecutarAvisosPuntos(dependencias);
  deepStrictEqual(registro.borrados, ['ExponentPushToken[viejo]']);
  equal(resumen.tokensBorrados, 1);
  equal(resumen.fallidos, 1);
});

Deno.test('F11b R5: una fila con forma inválida no se manda y queda en el resumen', async () => {
  const { dependencias, registro } = dobles([{ ...aviso(), estado_bono: 'RARO' }, aviso({ partido_id: 9 })]);
  const resumen = await ejecutarAvisosPuntos(dependencias);
  equal(registro.enviados.length, 1);
  equal(registro.enviados[0]?.data.ruta, '/partido/9');
  ok(resumen.errores[0]?.includes('forma inválida'));
});
