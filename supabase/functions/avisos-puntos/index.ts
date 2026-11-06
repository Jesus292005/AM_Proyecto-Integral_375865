import { withSupabase } from '@supabase/server';

import { crearClienteExpo } from '../_shared/notificaciones/expo.ts';
import { ejecutarAvisosPuntos } from '../_shared/notificaciones/puntos.ts';
import { crearRepositorioAvisosPuntos } from '../_shared/notificaciones/repositorio.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F11b: aviso de puntos listos. La invoca la tarea programada `pg_cron` cada minuto, solo si hay
// avisos listos (R7), con la clave secreta de Vault en `apikey`; por eso `verify_jwt = false`.
// Cuerpo: `{}`.

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const resumen = await ejecutarAvisosPuntos({
      ahora: () => new Date(),
      enviarAExpo: crearClienteExpo(),
      ...crearRepositorioAvisosPuntos(ctx.supabaseAdmin),
    });

    // Registro de la función: cuántos avisos se enviaron y cuántos fallaron.
    console.log(JSON.stringify({ funcion: 'avisos-puntos', ...resumen }));
    return Response.json(resumen, { status: resumen.errores.length > 0 ? 502 : 200 });
  }),
};
