import { withSupabase } from '@supabase/server';

import { crearClienteAnthropic } from '../_shared/evaluacion-ia/anthropic.ts';
import { ejecutarEvaluaciones } from '../_shared/evaluacion-ia/evaluar.ts';
import { crearRepositorioEvaluacion } from '../_shared/evaluacion-ia/repositorio.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F06: evaluación de las justificaciones con IA. La invoca la tarea programada `pg_cron` cada
// minuto, solo si hay evaluaciones por hacer y queda tope diario (R14), con la clave secreta de
// Vault en `apikey`; por eso `verify_jwt = false`. Cuerpo: `{}`. La clave de Anthropic es un
// secreto del servidor (R12): sin ella no toma nada.

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const clave = Deno.env.get('ANTHROPIC_API_KEY');
    if (clave === undefined || clave === '') {
      console.log(JSON.stringify({ funcion: 'evaluar', error: 'SIN_CLAVE' }));
      return Response.json({ error: 'SIN_CLAVE' }, { status: 500 });
    }

    const resumen = await ejecutarEvaluaciones({
      ahora: () => new Date(),
      llamarIA: crearClienteAnthropic(clave),
      ...crearRepositorioEvaluacion(ctx.supabaseAdmin),
    });

    // Registro de la función: evaluadas, reintentos, errores, llamadas y tokens (R10).
    console.log(JSON.stringify({ funcion: 'evaluar', ...resumen }));
    return Response.json(resumen, { status: resumen.errores.length > 0 ? 502 : 200 });
  }),
};
