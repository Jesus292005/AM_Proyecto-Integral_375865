// Nombres cortos de los equipos (S02, B4), cargados a mano: el `code` de la API se repite entre
// equipos o llega en null (T23). Por `proveedorId` de API-Football. Un equipo que no esté aquí
// usa el nombre de la API (A8). Aquí también irán los colores de D70.
const nombresCortos: ReadonlyMap<number, string> = new Map([
  [2278, 'Chivas'],
  [2279, 'Tigres'],
  [2280, 'Tijuana'],
  [2281, 'Toluca'],
  [2282, 'Monterrey'],
  [2283, 'Atlas'],
  [2285, 'Santos'],
  [2286, 'Pumas'],
  [2287, 'América'],
  [2288, 'Necaxa'],
  [2289, 'León'],
  [2290, 'Querétaro'],
  [2291, 'Puebla'],
  [2292, 'Pachuca'],
  [2295, 'Cruz Azul'],
  [2298, 'Juárez'],
  [2312, 'Atlante'], // Entra en 2026 en lugar de Mazatlán.
  [2314, 'San Luis'],
  [14002, 'Mazatlán'], // Solo en los datos de 2024 (desarrollo).
]);

export function nombreCortoDeEquipo(proveedorId: number, nombreApi: string): string {
  return nombresCortos.get(proveedorId) ?? nombreApi;
}
