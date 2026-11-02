import { withSupabase } from '@supabase/server';
import { z } from 'zod';

import { crearClienteApi } from '../_shared/api-football/cliente.ts';
import {
  ejecutarCargaInicial,
  esquemaParametrosCarga,
} from '../_shared/sincronizacion/carga-inicial.ts';
import { crearRepositorioSincronizacion } from '../_shared/sincronizacion/repositorio.ts';
import type { Database } from '../_shared/tipos-db.ts';

// F02 P1: carga inicial de un torneo. La invoca el administrador a mano con la clave secreta de
// Supabase (`apikey`); por eso `verify_jwt = false` en config.toml.
// Cuerpo: { "temporada": 2024, "prefijoRondas": "Apertura", "nombre": "Apertura 2024", "esActual": true }

export default {
  fetch: withSupabase<Database>({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Usa POST.' }, { status: 405 });
    }

    const parametros = esquemaParametrosCarga.safeParse(await req.json().catch(() => null));
    if (!parametros.success) {
      return Response.json({ error: z.prettifyError(parametros.error) }, { status: 400 });
    }

    const clave = Deno.env.get('API_FOOTBALL_KEY');
    if (!clave) {
      return Response.json({ error: 'Falta el secreto API_FOOTBALL_KEY.' }, { status: 500 });
    }

    const resultado = await ejecutarCargaInicial(parametros.data, {
      consultarApi: crearClienteApi(clave),
      ...crearRepositorioSincronizacion(ctx.supabaseAdmin),
      ahora: () => new Date(),
    });

    const status = { EXITO: 200, DETENIDA_POR_TOPE: 429, ERROR: 502, EN_CURSO: 500 }[resultado.estado];
    return Response.json(resultado, { status });
  }),
};
