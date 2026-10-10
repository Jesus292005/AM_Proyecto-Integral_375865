// Tokens de la guía visual (specs/05-ui.md). Ninguna pantalla usa valores sueltos:
// todo color, tamaño de letra, espacio y radio sale de aquí, a través de `useTema()`.

export interface ColoresTema {
  fondo: string;
  superficie: string;
  superficie2: string;
  linea: string;
  lineaSuave: string;
  texto: string;
  texto2: string;
  textoTenue: string;
  acento: string;
  sobreAcento: string;
  acierto: string;
  parcial: string;
  fallo: string;
  pendiente: string;
}

export type NombreColor = keyof ColoresTema;

export interface Metal {
  degradado: readonly [string, string, string];
  texto: string;
}

export interface MetalesTema {
  bronce: Metal;
  plata: Metal;
  oro: Metal;
}

// Paleta "Grafito y naranja balón" (D65). Agregar una paleta = otro objeto con los mismos nombres.
const textoTenueGrafito = '#A59D95';

export const coloresGrafito: ColoresTema = {
  fondo: '#131211',
  superficie: '#1C1A18',
  superficie2: '#272421',
  linea: '#37332F',
  lineaSuave: '#272421',
  texto: '#F3EEE8',
  texto2: '#C9C1B9',
  textoTenue: textoTenueGrafito,
  acento: '#FF6A2B',
  sobreAcento: '#1C0B03',
  acierto: '#4CD38A',
  parcial: '#E7C84B',
  fallo: '#E85D75',
  pendiente: textoTenueGrafito,
};

// Metales: solo recompensas (U6).
export const metalesGrafito: MetalesTema = {
  bronce: { degradado: ['#7A4A28', '#D9A06B', '#6E4323'], texto: '#24140A' },
  plata: { degradado: ['#8E979E', '#E3E8EC', '#7D868D'], texto: '#1B1F22' },
  oro: { degradado: ['#9C7420', '#F3D27A', '#8A6418'], texto: '#2A1E05' },
};

// Nombres de familia registrados en `fuentes.ts`.
export const familias = {
  teko500: 'Teko_500Medium',
  teko600: 'Teko_600SemiBold',
  teko700: 'Teko_700Bold',
  archivo400: 'Archivo_400Regular',
  archivo600: 'Archivo_600SemiBold',
  archivo800: 'Archivo_800ExtraBold',
} as const;

export interface EstiloTexto {
  esTeko: boolean;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  mayusculas: boolean;
  letterSpacing: number;
}

function estilo(
  fontFamily: string,
  fontSize: number,
  interlineado: number,
  opciones: { mayusculas?: boolean; espaciadoEm?: number } = {},
): EstiloTexto {
  return {
    esTeko: fontFamily.startsWith('Teko'),
    fontFamily,
    fontSize,
    lineHeight: fontSize * interlineado,
    mayusculas: opciones.mayusculas ?? false,
    letterSpacing: fontSize * (opciones.espaciadoEm ?? 0),
  };
}

export const tipografia = {
  marcadorXL: estilo(familias.teko700, 110, 0.8),
  titulo1: estilo(familias.teko700, 46, 0.85, { mayusculas: true }),
  titulo2: estilo(familias.teko700, 28, 1, { mayusculas: true }),
  numero: estilo(familias.teko600, 26, 1),
  pestana: estilo(familias.teko600, 22, 1, { mayusculas: true }),
  cuerpo: estilo(familias.archivo400, 15, 1.4),
  cuerpoFuerte: estilo(familias.archivo600, 15, 1.4),
  cita: estilo(familias.archivo600, 17, 1.3),
  etiqueta: estilo(familias.archivo800, 11, 1.2, { mayusculas: true, espaciadoEm: 0.14 }),
  meta: estilo(familias.archivo600, 13, 1.3),
  // Archivo 800 (D74).
  menu: estilo(familias.archivo800, 12, 1, { mayusculas: true, espaciadoEm: 0.12 }),
} satisfies Record<string, EstiloTexto>;

export type VarianteTexto = keyof typeof tipografia;

export const espacio = {
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const medidas = {
  margenPantalla: 20,
  radio: 4,
  radioModal: 12,
  linea: 1,
  barraActiva: 3,
  areaTactil: 44,
  altoBoton: 54,
  // Tamaño de letra del sistema respetado hasta 1.3× (05-ui §3, accesibilidad).
  escalaTextoMaxima: 1.3,
  // Teko deja los números altos en su caja (ascendente 958, descendente 475, mayúsculas 642 por
  // 1000 unidades): su centro visual queda ~0.08 em arriba del centro de la línea. Se compensa una
  // sola vez en `Texto`. Valor calculado de las métricas de la fuente; se calibra en el teléfono.
  ajusteTekoEm: 0.08,
  opacidadPresionado: 0.8,
} as const;

export interface Tema {
  nombre: string;
  colores: ColoresTema;
  metales: MetalesTema;
  tipografia: typeof tipografia;
  espacio: typeof espacio;
  medidas: typeof medidas;
}

export const temaGrafito: Tema = {
  nombre: 'grafito',
  colores: coloresGrafito,
  metales: metalesGrafito,
  tipografia,
  espacio,
  medidas,
};
