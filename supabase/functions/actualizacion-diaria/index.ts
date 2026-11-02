import { withSupabase } from '@supabase/server';

import { crearClienteApi } from '../_shared/api-football/cliente.ts';
import { crearRepositorioSincronizacion } from '../_shared/sincronizacion/repositorio.ts';
import { ejecutarActualizacionDiaria } from '../_shared/sincronizacion/sincronizacion-torneo.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F02 P2: actualización diaria del torneo actual. La invoca la tarea programada `pg_cron`
// (06:00 en Tijuana, D83) con la clave secreta de Vault en `apikey`; por eso `verify_jwt = false`
// en config.toml. No lleva cuerpo: el torneo es el que tiene `es_actual`.

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const clave = Deno.env.get('API_FOOTBALL_KEY');
    if (!clave) {
      return Response.json({ error: 'Falta el secreto API_FOOTBALL_KEY.' }, { status: 500 });
    }

    const resultado = await ejecutarActualizacionDiaria({
      consultarApi: crearClienteApi(clave),
      ...crearRepositorioSincronizacion(ctx.supabaseAdmin),
      ahora: () => new Date(),
    });

    const status = { EXITO: 200, DETENIDA_POR_TOPE: 429, ERROR: 502, EN_CURSO: 500 }[resultado.estado];
    return Response.json(resultado, { status });
  }),
};
