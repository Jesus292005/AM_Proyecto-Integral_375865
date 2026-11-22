import { z } from 'zod';

import type { EquipoDePartido } from '../partidos/datos';

// Los equipos llegan en columnas planas `local_*` / `visitante_*`.
export const columnasEquipos = {
  local_nombre_corto: z.string(),
  local_escudo_url: z.string(),
  local_color_primario: z.string().nullable(),
  local_color_texto: z.string().nullable(),
  visitante_nombre_corto: z.string(),
  visitante_escudo_url: z.string(),
  visitante_color_primario: z.string().nullable(),
  visitante_color_texto: z.string().nullable(),
};
export const COLUMNAS_EQUIPOS =
  'local_nombre_corto, local_escudo_url, local_color_primario, local_color_texto, visitante_nombre_corto, visitante_escudo_url, visitante_color_primario, visitante_color_texto';

export type FilaEquipos = { [K in keyof typeof columnasEquipos]: z.infer<(typeof columnasEquipos)[K]> };

export function equipos(fila: FilaEquipos): { local: EquipoDePartido; visitante: EquipoDePartido } {
  return {
    local: {
      nombre_corto: fila.local_nombre_corto,
      escudo_url: fila.local_escudo_url,
      color_primario: fila.local_color_primario,
      color_texto: fila.local_color_texto,
    },
    visitante: {
      nombre_corto: fila.visitante_nombre_corto,
      escudo_url: fila.visitante_escudo_url,
      color_primario: fila.visitante_color_primario,
      color_texto: fila.visitante_color_texto,
    },
  };
}
