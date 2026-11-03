import type { Database } from '../supabase/tipos-db';

// Estado del formulario de S03 (F03). La app solo guarda lo que el usuario eligió (R3): no deduce
// resultado ni rango de un marcador. La forma válida (R2) la vuelve a validar el servidor (R02).

type Enums = Database['public']['Enums'];
export type Resultado = Enums['resultado_prediccion'];
export type RangoGoles = Enums['rango_goles'];
export type EstadoPartido = Enums['estado_partido'];

// D72.
export const MARCADOR_MAXIMO = 10;

/** Lo que se escribe en `prediccion`: siempre las 4 columnas, para borrar la otra forma. */
export type EleccionPrediccion = {
  resultado: Resultado | null;
  rango_goles: RangoGoles | null;
  marcador_local: number | null;
  marcador_visitante: number | null;
};

export type Prediccion = EleccionPrediccion & { actualizada_en: string };

export type Pestana = 'resultadoGoles' | 'marcador';

export type Formulario = {
  pestana: Pestana;
  resultado: Resultado | null;
  rango: RangoGoles | null;
  marcador: { local: number; visitante: number };
};

/** El formulario muestra lo guardado y abre en su pestaña (Flujo 2). */
export function formularioInicial(guardada: Prediccion | null): Formulario {
  const conMarcador = guardada?.marcador_local != null && guardada.marcador_visitante != null;
  return {
    pestana: conMarcador ? 'marcador' : 'resultadoGoles',
    resultado: guardada?.resultado ?? null,
    rango: guardada?.rango_goles ?? null,
    marcador: {
      local: guardada?.marcador_local ?? 0,
      visitante: guardada?.marcador_visitante ?? 0,
    },
  };
}

/** Solo la pestaña activa (Flujo 3); null si no hay una elección válida (R2). */
export function eleccionDe(formulario: Formulario): EleccionPrediccion | null {
  if (formulario.pestana === 'marcador') {
    return {
      resultado: null,
      rango_goles: null,
      marcador_local: formulario.marcador.local,
      marcador_visitante: formulario.marcador.visitante,
    };
  }
  if (formulario.resultado === null && formulario.rango === null) return null;
  return {
    resultado: formulario.resultado,
    rango_goles: formulario.rango,
    marcador_local: null,
    marcador_visitante: null,
  };
}

/** "Guardar" se habilita con una elección válida distinta de lo guardado (Flujo 3, CA7). */
export function puedeGuardar(formulario: Formulario, guardada: Prediccion | null): boolean {
  const eleccion = eleccionDe(formulario);
  if (eleccion === null) return false;
  if (guardada === null) return true;
  return (
    eleccion.resultado !== guardada.resultado ||
    eleccion.rango_goles !== guardada.rango_goles ||
    eleccion.marcador_local !== guardada.marcador_local ||
    eleccion.marcador_visitante !== guardada.marcador_visitante
  );
}

/**
 * Con el reloj del teléfono, solo para mostrar (R8): decide el servidor (R1). Abierto = antes del
 * cierre y sin empezar.
 */
export function prediccionAbierta(
  partido: { cierre_predicciones: string; estado: EstadoPartido },
  ahora: Date,
): boolean {
  const editable = partido.estado === 'PROGRAMADO' || partido.estado === 'POSPUESTO';
  return editable && ahora.getTime() < Date.parse(partido.cierre_predicciones);
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Menos de 24 h: "hh:mm:ss"; más: null (se muestra la fecha del cierre, R8). */
export function contadorCierre(cierre: Date, ahora: Date): string | null {
  const restante = Math.max(0, cierre.getTime() - ahora.getTime());
  if (restante >= UN_DIA_MS) return null;
  const segundos = Math.floor(restante / 1000);
  const partes = [Math.floor(segundos / 3600), Math.floor(segundos / 60) % 60, segundos % 60];
  return partes.map((n) => String(n).padStart(2, '0')).join(':');
}
