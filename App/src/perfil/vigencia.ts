/**
 * Cuánto se reusan perfil, racha y carta sin volver a pedirlos al montar otra pantalla que los use
 * (la barra superior está en las 4 pestañas, F25 R4). Volver a una pestaña los pide de todos modos
 * (`useReleerAlVolver`), y guardar el nombre o el equipo los invalida.
 */
export const VIGENCIA_PERFIL_MS = 30_000;
