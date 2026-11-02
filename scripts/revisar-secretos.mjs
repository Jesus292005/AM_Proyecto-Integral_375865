// T27 — Revisión de secretos (F02 CA13, F01 CA9, D14). Uso: `npm run revisar:secretos` en la raíz.
//
// 1. Exporta el paquete JavaScript real de la app para Android (`expo export`) a una carpeta
//    temporal fuera del repo y busca en él la clave de API-Football (su valor real, leído de
//    `supabase/functions/.env`), claves secretas de Supabase o de Anthropic y rastros de llamadas a
//    API-Football. Control positivo: la URL pública de Supabase SÍ debe aparecer; si no, la búsqueda
//    no está viendo el contenido y la revisión falla.
// 2. Comprueba que la clave de Supabase de la app sea la pública (`sb_publishable_`).
// 3. Busca la clave de API-Football y claves secretas en los archivos versionados del repo.
//
// Nunca imprime valores: solo qué se encontró y dónde. Termina con código 1 si algo falla.
// Límite: no revisa el APK nativo; los secretos no pueden llegar ahí porque solo las variables
// `EXPO_PUBLIC_` se incluyen en la app y ninguna lleva secretos.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const APP = join(RAIZ, 'App');

/** Variables de un archivo `.env` (vacío si no existe). */
function leerEnv(ruta) {
  const variables = new Map();
  if (!existsSync(ruta)) return variables;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const coincidencia = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (coincidencia?.[2]) variables.set(coincidencia[1], coincidencia[2].trim());
  }
  return variables;
}

function archivosDe(carpeta) {
  return readdirSync(carpeta, { recursive: true })
    .map((nombre) => join(carpeta, nombre))
    .filter((ruta) => statSync(ruta).isFile());
}

const servidor = leerEnv(join(RAIZ, 'supabase', 'functions', '.env'));
const app = leerEnv(join(APP, '.env'));
const claveApiFootball = servidor.get('API_FOOTBALL_KEY');

// Claves con su forma real (no solo el prefijo, que aparece en la documentación).
const formasDeClave = [
  { nombre: 'clave secreta de Supabase (sb_secret_…)', regex: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { nombre: 'clave de Anthropic (sk-ant-…)', regex: /sk-ant-[A-Za-z0-9_-]{20,}/ },
];

const hallazgos = [];
const avisos = [];

// --- 1. Paquete de la app ---

const salida = mkdtempSync(join(tmpdir(), 'revisar-secretos-'));
try {
  console.log('Exportando el paquete de la app para Android…');
  // Sin bytecode: mismos textos que el bytecode de Hermes que se envía, pero entre comillas. En el
  // bytecode van pegados uno tras otro, y el `"sb_secret_"` con que supabase-js reconoce el tipo de
  // una clave quedaba seguido del texto siguiente y parecía una clave real (falso positivo).
  const exportar = spawnSync(
    `npx expo export --platform android --output-dir "${salida}" --no-bytecode`,
    { cwd: APP, stdio: ['ignore', 'ignore', 'inherit'], shell: true },
  );
  if (exportar.status !== 0) throw new Error('`expo export` falló');

  const archivos = archivosDe(salida);
  // latin1: cada byte es un carácter; basta para buscar texto ASCII también en archivos binarios.
  const contenido = archivos.map((ruta) => ({ ruta, texto: readFileSync(ruta, 'latin1') }));
  const enPaquete = (buscar) =>
    contenido.filter(({ texto }) =>
      typeof buscar === 'string' ? texto.includes(buscar) : buscar.test(texto),
    );

  const urlPublica = app.get('EXPO_PUBLIC_SUPABASE_URL');
  if (!urlPublica) hallazgos.push('App/.env no tiene EXPO_PUBLIC_SUPABASE_URL (control positivo)');
  else if (enPaquete(urlPublica).length === 0) {
    hallazgos.push('Control positivo: la URL pública de Supabase no aparece en el paquete');
  } else console.log(`Control positivo: la URL pública de Supabase sí aparece (${archivos.length} archivos).`);

  if (claveApiFootball) {
    for (const { ruta } of enPaquete(claveApiFootball)) {
      hallazgos.push(`La clave de API-Football está en el paquete: ${ruta}`);
    }
  } else avisos.push('No hay API_FOOTBALL_KEY en supabase/functions/.env: no se buscó su valor');

  for (const { nombre, regex } of formasDeClave) {
    for (const { ruta } of enPaquete(regex)) hallazgos.push(`Hay una ${nombre} en el paquete: ${ruta}`);
  }
  for (const rastro of ['api-sports.io', 'x-apisports-key']) {
    for (const { ruta } of enPaquete(rastro)) {
      hallazgos.push(`La app contiene "${rastro}" (no debe llamar a API-Football, B-R1): ${ruta}`);
    }
  }
} finally {
  rmSync(salida, { recursive: true, force: true });
}

// --- 2. Clave de Supabase de la app ---

const clavePublica = app.get('EXPO_PUBLIC_SUPABASE_KEY');
if (!clavePublica?.startsWith('sb_publishable_')) {
  hallazgos.push('EXPO_PUBLIC_SUPABASE_KEY no es una clave pública (sb_publishable_…)');
} else console.log('La clave de Supabase de la app es la pública (sb_publishable_…).');

// --- 3. Archivos versionados ---

const versionados = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
for (const relativa of versionados) {
  const ruta = join(RAIZ, relativa);
  if (!existsSync(ruta)) continue;
  const texto = readFileSync(ruta, 'latin1');
  if (claveApiFootball && texto.includes(claveApiFootball)) {
    hallazgos.push(`La clave de API-Football está versionada en: ${relativa}`);
  }
  for (const { nombre, regex } of formasDeClave) {
    if (regex.test(texto)) hallazgos.push(`Hay una ${nombre} versionada en: ${relativa}`);
  }
}
console.log(`Revisados ${versionados.length} archivos versionados.`);

// --- Resultado ---

for (const aviso of avisos) console.log(`Aviso: ${aviso}`);
if (hallazgos.length > 0) {
  console.error('\nREVISIÓN FALLIDA:');
  for (const hallazgo of hallazgos) console.error(`- ${hallazgo}`);
  process.exit(1);
}
console.log('\nSin secretos: la app no contiene claves secretas y ninguna está versionada.');
