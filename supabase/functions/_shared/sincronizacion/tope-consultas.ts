import type { Database } from '../tipos-db.ts';

type TipoSincronizacion = Database['public']['Enums']['tipo_sincronizacion'];

/** F02 R4: al llegar a este total de consultas en el día se detienen P1 y P2 (el plan da 100). */
export const TOPE_CONSULTAS_DIARIAS = 90;

// P3 y P4 siguen con el tope alcanzado: solo consultan partidos que ya debieron terminar (R4).
const procesosSinTope: ReadonlySet<TipoSincronizacion> = new Set([
  'DETECCION_FINALES',
  'DATOS_PARTIDO',
]);

/**
 * Se revisa antes de cada consulta. `consultasDelDia` = consultas registradas en `sincronizacion`
 * desde `inicioDelDiaDeConsultas`. Registrar la alerta cuando da `false` le toca a quien llama.
 */
export function puedeConsultar(consultasDelDia: number, proceso: TipoSincronizacion): boolean {
  return procesosSinTope.has(proceso) || consultasDelDia < TOPE_CONSULTAS_DIARIAS;
}

/**
 * Inicio del día de consultas: 00:00 UTC, cuando API-Football reinicia el límite diario (en
 * Tijuana, 17:00 del día anterior en horario de verano y 16:00 en el de invierno).
 */
export function inicioDelDiaDeConsultas(ahora: Date): Date {
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}
