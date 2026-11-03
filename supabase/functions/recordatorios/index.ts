import { withSupabase } from '@supabase/server';

import { crearClienteExpo } from '../_shared/notificaciones/expo.ts';
import { ejecutarRecordatorios } from '../_shared/notificaciones/recordatorios.ts';
import { crearRepositorioRecordatorios } from '../_shared/notificaciones/repositorio.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F11a: recordatorio 1 h antes del cierre. La invoca la tarea programada `pg_cron` cada 15 min,
// solo si hay pendientes (R7), con la clave secreta de Vault en `apikey`; por eso
// `verify_jwt = false`. Cuerpo: `{}`.

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const resumen = await ejecutarRecordatorios({
      ahora: () => new Date(),
      enviarAExpo: crearClienteExpo(),
      ...crearRepositorioRecordatorios(ctx.supabaseAdmin),
    });

    // Registro de la función: cuántos se enviaron y cuántos fallaron (Flujo 2).
    console.log(JSON.stringify({ funcion: 'recordatorios', ...resumen }));
    return Response.json(resumen, { status: resumen.errores.length > 0 ? 502 : 200 });
  }),
};
