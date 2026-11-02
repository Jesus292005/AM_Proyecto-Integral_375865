// Fechas y horas para mostrar: español de México y, por defecto, la zona horaria del teléfono
// (F02 B4: los partidos en la hora del teléfono). `zonaHoraria` solo se pasa en las pruebas.

const IDIOMA = 'es-MX';

// Intl separa "p. m." con espacios especiales (sin salto); se dejan espacios normales.
function conEspaciosNormales(texto: string): string {
  return texto.replace(/\s/gu, ' ');
}

/** "7:05 p. m." */
export function formatearHora(fecha: Date, zonaHoraria?: string): string {
  return conEspaciosNormales(
    new Intl.DateTimeFormat(IDIOMA, { hour: 'numeric', minute: '2-digit', timeZone: zonaHoraria })
      .format(fecha),
  );
}

/**
 * "sáb 13 jul" (se muestra en mayúsculas con el token `etiqueta`). Se arma por partes porque el
 * formato completo cambia entre versiones de Intl ("sáb, 13 jul" / "sáb 13 de jul").
 */
export function formatearDia(fecha: Date, zonaHoraria?: string): string {
  const partes = new Intl.DateTimeFormat(IDIOMA, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: zonaHoraria,
  }).formatToParts(fecha);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    (partes.find((p) => p.type === tipo)?.value ?? '').replace('.', '');
  return `${parte('weekday')} ${parte('day')} ${parte('month')}`;
}

/** "2024-07-13": el día en la zona indicada, para agrupar. */
export function claveDia(fecha: Date, zonaHoraria?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: zonaHoraria,
  }).format(fecha);
}
