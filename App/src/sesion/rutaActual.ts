import { useGlobalSearchParams, usePathname, useSegments, type Href } from 'expo-router';
import { useMemo } from 'react';

type Parametros = Record<string, string | string[]>;

/**
 * Ruta abierta en este momento (camino + parámetros de consulta, p. ej. `/partidos?jornada=2`),
 * para volver a ella después de iniciar sesión (CA8).
 */
export function useRutaActual(): Href {
  const camino = usePathname();
  const segmentos: string[] = useSegments();
  const todos = useGlobalSearchParams();

  // Los parámetros de los segmentos dinámicos (`[partidoId]`) ya van dentro del camino.
  const consulta: Parametros = {};
  const dinamicos = new Set(segmentos.map((s) => /^\[(?:\.\.\.)?(.+)\]$/.exec(s)?.[1]));
  for (const [clave, valor] of Object.entries(todos)) {
    if (valor !== undefined && !dinamicos.has(clave)) consulta[clave] = valor;
  }
  const claveConsulta = JSON.stringify(consulta);

  return useMemo(
    () => ({ pathname: camino, params: JSON.parse(claveConsulta) as Parametros }) as Href,
    [camino, claveConsulta],
  );
}
