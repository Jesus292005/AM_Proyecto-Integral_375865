import { deepStrictEqual, equal, match } from 'node:assert/strict';

import type { RespuestaHttp } from '../api-football/cliente.ts';
import type { MensajeExpo } from './expo.ts';
import {
  agruparAvisos,
  cuerpoAviso,
  type DependenciasRecordatorios,
  ejecutarRecordatorios,
  type ParAviso,
  type Pendiente,
} from './recordatorios.ts';

const AHORA = new Date('2026-11-02T18:00:00Z');
const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';

function pendiente(usuario: string, partido: number, minutos: number, extra: Partial<Pendiente> = {}) {
  return {
    usuario_id: usuario,
    partido_id: partido,
    cierre_predicciones: new Date(AHORA.getTime() + minutos * 60_000).toISOString(),
    jornada_orden: 17,
    local: 'América',
    visitante: 'Pumas',
    tokens: [`ExponentPushToken[${usuario.at(-1)}]`],
    ...extra,
  } satisfies Pendiente;
}

const ticketsOk = (n: number): RespuestaHttp => ({
  tipo: 'ok',
  cuerpo: { data: Array.from({ length: n }, (_, i) => ({ status: 'ok', id: `t${i}` })) },
});

/** Base falsa: `notificacion_enviada` en memoria y los envíos anotados. */
function base(pendientes: Pendiente[], responder: (m: readonly MensajeExpo[]) => RespuestaHttp = (m) => ticketsOk(m.length)) {
  const enviadas = new Set<string>();
  const envios: MensajeExpo[][] = [];
  const borrados: string[] = [];
  const dependencias: DependenciasRecordatorios = {
    ahora: () => AHORA,
    buscarPendientes: () =>
      Promise.resolve(pendientes.filter((p) => !enviadas.has(`${p.usuario_id}:${p.partido_id}`))),
    reclamarAvisos: (pares: readonly ParAviso[]) =>
      Promise.resolve(
        pares.filter((p) => {
          const clave = `${p.usuario_id}:${p.partido_id}`;
          if (enviadas.has(clave)) return false;
          enviadas.add(clave);
          return true;
        }),
      ),
    enviarAExpo: (mensajes) => {
      envios.push([...mensajes]);
      return Promise.resolve(responder(mensajes));
    },
    borrarTokens: (tokens) => {
      borrados.push(...tokens);
      return Promise.resolve();
    },
  };
  return { dependencias, enviadas, envios, borrados };
}

Deno.test('F11a CA3: el texto con un partido y con varios (R8)', () => {
  equal(cuerpoAviso([{ local: 'América', visitante: 'Pumas' }]), 'América vs Pumas: aún no lo predices.');
  equal(
    cuerpoAviso([
      { local: 'América', visitante: 'Pumas' },
      { local: 'Chivas', visitante: 'Atlas' },
      { local: 'Tigres', visitante: 'Monterrey' },
    ]),
    'América vs Pumas y 2 partidos más: aún no los predices.',
  );
  equal(
    cuerpoAviso([
      { local: 'América', visitante: 'Pumas' },
      { local: 'Chivas', visitante: 'Atlas' },
    ]),
    'América vs Pumas y 1 partido más: aún no los predices.',
  );
});

Deno.test('F11a CA3: agrupa en un aviso por usuario; uno abre S03 y varios S02 de su jornada', () => {
  const avisos = agruparAvisos([
    pendiente(A, 12, 50, { local: 'Chivas', visitante: 'Atlas', jornada_orden: 16 }),
    pendiente(A, 11, 30),
    pendiente(B, 11, 30),
  ]);
  equal(avisos.length, 2);
  const deA = avisos.find((a) => a.usuarioId === A);
  deepStrictEqual(deA?.partidos, [11, 12]);
  equal(deA?.cuerpo, 'América vs Pumas y 1 partido más: aún no los predices.');
  equal(deA?.ruta, '/partidos?jornada=17');
  equal(avisos.find((a) => a.usuarioId === B)?.ruta, '/partido/11');
  equal(deA?.titulo, 'Cierra en menos de 1 h');
});

Deno.test('F11a CA3: manda el aviso a cada dispositivo, escribe notificacion_enviada y no repite', async () => {
  const { dependencias, enviadas, envios } = base([
    pendiente(A, 11, 30, { tokens: ['ExponentPushToken[a]', 'ExponentPushToken[a2]'] }),
    pendiente(A, 12, 45, { tokens: ['ExponentPushToken[a]', 'ExponentPushToken[a2]'] }),
    pendiente(B, 11, 30),
  ]);

  const primera = await ejecutarRecordatorios(dependencias);

  equal(primera.avisos, 2);
  equal(primera.mensajes, 3);
  equal(primera.enviados, 3);
  equal(primera.fallidos, 0);
  deepStrictEqual(
    envios[0]?.map((m) => m.to),
    ['ExponentPushToken[a]', 'ExponentPushToken[a2]', 'ExponentPushToken[b]'],
  );
  deepStrictEqual(envios[0]?.[0]?.data, { ruta: '/partidos?jornada=17' });
  equal(envios[0]?.[0]?.channelId, 'recordatorios');
  deepStrictEqual([...enviadas].sort(), [`${A}:11`, `${A}:12`, `${B}:11`]);

  const segunda = await ejecutarRecordatorios(dependencias);
  equal(segunda.mensajes, 0);
  equal(envios.length, 1);
});

Deno.test('F11a R6: lo ya reclamado por otra ejecución no se manda', async () => {
  const { dependencias, enviadas, envios } = base([pendiente(A, 11, 30)]);
  enviadas.add(`${A}:11`);
  dependencias.buscarPendientes = () => Promise.resolve([pendiente(A, 11, 30)]);

  const resumen = await ejecutarRecordatorios(dependencias);

  equal(resumen.avisos, 0);
  equal(envios.length, 0);
});

Deno.test('F11a R6: envía en bloques de 100', async () => {
  const pendientes = Array.from({ length: 150 }, (_, i) =>
    pendiente(`00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, 11, 30, {
      tokens: [`ExponentPushToken[${i}]`],
    })
  );
  const { dependencias, envios } = base(pendientes);

  const resumen = await ejecutarRecordatorios(dependencias);

  deepStrictEqual(envios.map((e) => e.length), [100, 50]);
  equal(resumen.enviados, 150);
});

Deno.test('F11a CA4: un ticket DeviceNotRegistered borra ese token', async () => {
  const { dependencias, borrados } = base(
    [pendiente(A, 11, 30, { tokens: ['ExponentPushToken[viejo]', 'ExponentPushToken[a]'] })],
    () => ({
      tipo: 'ok',
      cuerpo: {
        data: [
          {
            status: 'error',
            message: '"ExponentPushToken[viejo]" is not a registered push notification recipient',
            details: { error: 'DeviceNotRegistered', expoPushToken: 'ExponentPushToken[viejo]' },
          },
          { status: 'ok', id: 't1' },
        ],
      },
    }),
  );

  const resumen = await ejecutarRecordatorios(dependencias);

  deepStrictEqual(borrados, ['ExponentPushToken[viejo]']);
  equal(resumen.tokensBorrados, 1);
  equal(resumen.enviados, 1);
  equal(resumen.fallidos, 1);
});

Deno.test('F11a CA4: una respuesta de Expo con forma inválida se registra como error sin reintentar', async () => {
  const { dependencias, envios, enviadas, borrados } = base([pendiente(A, 11, 30)], () => ({
    tipo: 'ok',
    cuerpo: { errores: 'algo raro' },
  }));

  const resumen = await ejecutarRecordatorios(dependencias);

  equal(envios.length, 1);
  equal(resumen.fallidos, 1);
  equal(resumen.enviados, 0);
  match(resumen.errores[0] ?? '', /forma inválida/);
  deepStrictEqual(borrados, []);
  // Ya quedó escrito: la siguiente ejecución no lo vuelve a intentar.
  equal(enviadas.size, 1);
  equal((await ejecutarRecordatorios(dependencias)).mensajes, 0);
});

Deno.test('F11a R6: si Expo no responde, el aviso se pierde y queda en el resumen', async () => {
  const { dependencias } = base([pendiente(A, 11, 30)], () => ({
    tipo: 'error',
    mensaje: 'Expo respondió 503',
  }));

  const resumen = await ejecutarRecordatorios(dependencias);

  equal(resumen.fallidos, 1);
  deepStrictEqual(resumen.errores, ['Expo respondió 503']);
});

Deno.test('sin pendientes no reclama ni envía nada', async () => {
  const { dependencias, envios } = base([]);
  const resumen = await ejecutarRecordatorios(dependencias);
  equal(resumen.avisos, 0);
  equal(envios.length, 0);
});
