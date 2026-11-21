// Datos de los equipos cargados a mano, por `proveedorId` de API-Football:
// - Nombre corto (S02, B4): el `code` de la API se repite entre equipos o llega en null (T23). Un
//   equipo que no esté aquí usa el nombre de la API (A8).
// - Colores (D70, F22 R4): la API no los da. P1 y P2 los escriben en `equipo`; un equipo que no esté
//   aquí queda sin colores (null) y la app usa el respaldo neutro (F22 R3).
type DatosEquipo = { nombreCorto: string; colorPrimario: string; colorTexto: string };

const datosEquipos: ReadonlyMap<number, DatosEquipo> = new Map([
  [2278, { nombreCorto: 'Chivas', colorPrimario: '#CD1F2D', colorTexto: '#FFFFFF' }],
  [2279, { nombreCorto: 'Tigres', colorPrimario: '#FDB913', colorTexto: '#00205B' }],
  [2280, { nombreCorto: 'Tijuana', colorPrimario: '#B5121B', colorTexto: '#FFFFFF' }],
  [2281, { nombreCorto: 'Toluca', colorPrimario: '#D0021B', colorTexto: '#FFFFFF' }],
  [2282, { nombreCorto: 'Monterrey', colorPrimario: '#0A2D6E', colorTexto: '#FFFFFF' }],
  [2283, { nombreCorto: 'Atlas', colorPrimario: '#C8102E', colorTexto: '#FFFFFF' }],
  [2285, { nombreCorto: 'Santos', colorPrimario: '#00A859', colorTexto: '#FFFFFF' }],
  [2286, { nombreCorto: 'Pumas', colorPrimario: '#0E2B5C', colorTexto: '#D4AF37' }],
  [2287, { nombreCorto: 'América', colorPrimario: '#FFD100', colorTexto: '#0B2341' }],
  [2288, { nombreCorto: 'Necaxa', colorPrimario: '#E4002B', colorTexto: '#FFFFFF' }],
  [2289, { nombreCorto: 'León', colorPrimario: '#00693C', colorTexto: '#FFFFFF' }],
  [2290, { nombreCorto: 'Querétaro', colorPrimario: '#1A3D7C', colorTexto: '#FFFFFF' }],
  [2291, { nombreCorto: 'Puebla', colorPrimario: '#1D3F8F', colorTexto: '#FFFFFF' }],
  [2292, { nombreCorto: 'Pachuca', colorPrimario: '#1E3A70', colorTexto: '#FFFFFF' }],
  [2295, { nombreCorto: 'Cruz Azul', colorPrimario: '#0057B8', colorTexto: '#FFFFFF' }],
  [2298, { nombreCorto: 'Juárez', colorPrimario: '#00A650', colorTexto: '#FFFFFF' }],
  // Entra en 2026 en lugar de Mazatlán.
  [2312, { nombreCorto: 'Atlante', colorPrimario: '#1B3E8C', colorTexto: '#FFFFFF' }],
  [2314, { nombreCorto: 'San Luis', colorPrimario: '#D71920', colorTexto: '#FFFFFF' }],
  // Solo en los datos de 2024 (desarrollo).
  [14002, { nombreCorto: 'Mazatlán', colorPrimario: '#5A2D82', colorTexto: '#FFFFFF' }],
]);

export function nombreCortoDeEquipo(proveedorId: number, nombreApi: string): string {
  return datosEquipos.get(proveedorId)?.nombreCorto ?? nombreApi;
}

/** Colores de D70 con los nombres de las columnas de `equipo`; null si el equipo no está aquí. */
export function coloresDeEquipo(
  proveedorId: number,
): { color_primario: string | null; color_texto: string | null } {
  const datos = datosEquipos.get(proveedorId);
  return { color_primario: datos?.colorPrimario ?? null, color_texto: datos?.colorTexto ?? null };
}
