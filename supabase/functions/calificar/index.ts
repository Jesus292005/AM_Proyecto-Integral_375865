import { withSupabase } from '@supabase/server';

import { ejecutarCalificacion } from '../_shared/calificacion/calificar.ts';
import { crearRepositorioCalificacion } from '../_shared/calificacion/repositorio.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F05: calificación de puntos base. La invoca la tarea programada `pg_cron` cada minuto, solo si
// hay partidos por calificar (R8), con la clave secreta de Vault en `apikey`; por eso
// `verify_jwt = false`. Cuerpo: `{}`.

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const resumen = await ejecutarCalificacion(crearRepositorioCalificacion(ctx.supabaseAdmin));

    // Registro de la función: partidos y predicciones calificados y errores (R9).
    console.log(JSON.stringify({ funcion: 'calificar', ...resumen }));
    return Response.json(resumen, { status: resumen.errores.length > 0 ? 502 : 200 });
  }),
};
