import type { Database } from '../supabase/tipos-db';

// Texto de una predicción en solo lectura (F03 Flujo 6), propia o de alguien del grupo (F07 R7).

type Enums = Database['public']['Enums'];

export type PrediccionLegible = {
  resultado: Enums['resultado_prediccion'] | null;
  rango_goles: Enums['rango_goles'] | null;
  marcador_local: number | null;
  marcador_visitante: number | null;
};

type Equipos = { local: { nombre_corto: string }; visitante: { nombre_corto: string } };

// D48.
const textoRango = { G0_1: '0–1', G2: '2', G3: '3', G4_MAS: '4 o más' } as const;

function textoResultado(partido: Equipos, resultado: Enums['resultado_prediccion']): string {
  if (resultado === 'LOCAL') return `Gana ${partido.local.nombre_corto}`;
  if (resultado === 'VISITANTE') return `Gana ${partido.visitante.nombre_corto}`;
  return 'Empate';
}

/** Las partes predichas con su etiqueta, en el orden de F03: marcador, resultado, goles. */
export function datosDePrediccion(
  partido: Equipos,
  prediccion: PrediccionLegible,
): { etiqueta: string; valor: string }[] {
  const datos: { etiqueta: string; valor: string }[] = [];
  const { marcador_local, marcador_visitante, resultado, rango_goles } = prediccion;
  if (marcador_local !== null && marcador_visitante !== null) {
    datos.push({
      etiqueta: 'Marcador exacto',
      valor: `${partido.local.nombre_corto} ${marcador_local} - ${marcador_visitante} ${partido.visitante.nombre_corto}`,
    });
  }
  if (resultado !== null) datos.push({ etiqueta: 'Resultado', valor: textoResultado(partido, resultado) });
  if (rango_goles !== null) datos.push({ etiqueta: 'Goles en total', valor: textoRango[rango_goles] });
  return datos;
}
