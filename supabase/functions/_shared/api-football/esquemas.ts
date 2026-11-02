import { z } from 'zod';

// Esquemas de las respuestas de API-Football (F02 R5, D54). Toda respuesta se valida antes de
// guardar; si no cumple, no se guarda nada de ella. Solo se validan los campos que se usan
// (03-data-model, T05): los demás se descartan, para que un campo nuevo de la API no rompa la
// sincronización. Ejemplos reales en ../ejemplos-api-football/.

/**
 * `errors` llega como `[]` cuando no hay error y como objeto (`{ "plan": "..." }`) cuando lo hay.
 * Una respuesta con errores pasa el esquema; tratarla como falla (R6) le toca a quien consulta.
 */
const esquemaErrores = z.union([z.tuple([]), z.record(z.string(), z.string())]);

// Parte común de toda respuesta; cada consulta la extiende con su `response`.
const esquemaRespuesta = z.object({ errors: esquemaErrores });

const idProveedor = z.int().positive();

// Marcador de medio tiempo o de 90 minutos; `null` mientras no se juega.
const esquemaMarcador = z.object({
  home: z.int().nonnegative().nullable(),
  away: z.int().nonnegative().nullable(),
});

const esquemaEquipoDePartido = z.object({
  id: idProveedor,
  name: z.string().min(1),
  logo: z.url(),
});

// `/fixtures`. El estado y la ronda son texto libre: uno desconocido solo afecta a ese partido
// (A6, A7) y se maneja al convertirlos, no aquí, para no rechazar la respuesta entera.
export const esquemaPartidoApi = z.object({
  fixture: z.object({
    id: idProveedor,
    date: z.iso.datetime({ offset: true }),
    status: z.object({ short: z.string().min(1) }),
  }),
  league: z.object({
    id: idProveedor,
    name: z.string().min(1),
    country: z.string().min(1),
    season: z.int(),
    round: z.string().min(1),
  }),
  teams: z.object({
    home: esquemaEquipoDePartido,
    away: esquemaEquipoDePartido,
  }),
  // `fulltime` = 90 minutos (R2); `extratime` y `penalty` no se usan (D43).
  score: z.object({
    halftime: esquemaMarcador,
    fulltime: esquemaMarcador,
  }),
});

// `/teams`. `code` se repite entre equipos o llega en `null`.
export const esquemaEquipoApi = z.object({
  team: z.object({
    id: idProveedor,
    name: z.string().min(1),
    code: z.string().nullable(),
    logo: z.url(),
  }),
});

// `/fixtures/statistics`: un elemento por equipo. `null` = sin dato, nunca 0 (D29).
export const esquemaEstadisticasEquipoApi = z.object({
  team: z.object({ id: idProveedor }),
  statistics: z.array(
    z.object({
      type: z.string().min(1),
      value: z.union([z.number(), z.string(), z.null()]),
    }),
  ),
});

// `/fixtures/events`. El tipo es texto libre ("Goal", "Card", "subst", "Var"); se convierte en P4.
export const esquemaEventoApi = z.object({
  time: z.object({
    elapsed: z.int().nonnegative(),
    extra: z.int().nonnegative().nullable(),
  }),
  team: z.object({ id: idProveedor }),
  type: z.string().min(1),
  detail: z.string(),
});

export const esquemaRespuestaPartidos = esquemaRespuesta.extend({
  response: z.array(esquemaPartidoApi),
});
export const esquemaRespuestaEquipos = esquemaRespuesta.extend({
  response: z.array(esquemaEquipoApi),
});
export const esquemaRespuestaEstadisticas = esquemaRespuesta.extend({
  response: z.array(esquemaEstadisticasEquipoApi),
});
export const esquemaRespuestaEventos = esquemaRespuesta.extend({
  response: z.array(esquemaEventoApi),
});

export type PartidoApi = z.infer<typeof esquemaPartidoApi>;
export type EquipoApi = z.infer<typeof esquemaEquipoApi>;
export type EstadisticasEquipoApi = z.infer<typeof esquemaEstadisticasEquipoApi>;
export type EventoApi = z.infer<typeof esquemaEventoApi>;
export type ErroresApi = z.infer<typeof esquemaErrores>;
