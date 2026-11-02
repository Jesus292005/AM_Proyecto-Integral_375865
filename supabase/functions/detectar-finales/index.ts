import { withSupabase } from '@supabase/server';
import { z } from 'zod';

import { crearClienteApi } from '../_shared/api-football/cliente.ts';
import { ejecutarDeteccionFinales } from '../_shared/sincronizacion/datos-partido.ts';
import { crearRepositorioSincronizacion } from '../_shared/sincronizacion/repositorio.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F02 P3 y P4. La invoca la tarea programada `pg_cron` cada 15 min, solo si hay partidos
// pendientes (D85), con la clave secreta de Vault en `apikey`; por eso `verify_jwt = false`.
// Cuerpo: `{}`. El administrador puede forzar P4 de partidos concretos (TERMINADO), sin ventanas:
// { "partidos": [1206057] }

const esquemaCuerpo = z.object({
  partidos: z.array(z.int().positive()).min(1).max(20).optional(),
});

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const cuerpo = esquemaCuerpo.safeParse(await req.json().catch(() => null));
    if (!cuerpo.success) {
      return Response.json({ error: z.prettifyError(cuerpo.error) }, { status: 400 });
    }

    const clave = Deno.env.get('API_FOOTBALL_KEY');
    if (!clave) {
      return Response.json({ error: 'Falta el secreto API_FOOTBALL_KEY.' }, { status: 500 });
    }

    const resultado = await ejecutarDeteccionFinales(
      {
        consultarApi: crearClienteApi(clave),
        ...crearRepositorioSincronizacion(ctx.supabaseAdmin),
        ahora: () => new Date(),
      },
      cuerpo.data.partidos,
    );

    const ejecuciones = [...(resultado.estados ? [resultado.estados] : []), ...resultado.datos];
    const hayError = ejecuciones.some((e) => e.estado === 'ERROR');
    return Response.json(resultado, { status: hayError ? 502 : 200 });
  }),
};
