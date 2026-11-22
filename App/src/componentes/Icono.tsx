import Svg, { Path } from 'react-native-svg';

import { useTema, type NombreColor } from '../tema';

// Íconos de trazo dibujados en una caja de 24 × 24 (05-ui §7). Se agregan solo cuando una spec
// los pide. Varios trazos de un ícono van en un solo `d` (cada uno empieza con `M` absoluta).
const trazos = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  // F10 (`IndicadorEstado`): ✗ fallada, ≈ parcial o cercana, … pendiente, – no verificable.
  equis: 'M7 7l10 10M17 7L7 17',
  aprox: 'M6 10c2-1.5 4-1.5 6 0s4 1.5 6 0M6 15c2-1.5 4-1.5 6 0s4 1.5 6 0',
  puntos: 'M7 12h.01M12 12h.01M17 12h.01',
  guion: 'M7 12h10',
  // M5 (F22 R2): trazos de Lucide (https://lucide.dev, licencia ISC; crédito en el README).
  // house
  casa:
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' +
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  // calendar
  calendario: 'M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18',
  // users
  usuarios:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0' +
    'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  // user
  usuario: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  // funnel
  filtro:
    'M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3' +
    'a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z',
  // pencil
  lapiz:
    'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622' +
    'l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4',
  // chevron-left / chevron-right
  chevronIzquierda: 'M15 18l-6-6 6-6',
  chevronDerecha: 'M9 18l6-6-6-6',
} as const;

export type NombreIcono = keyof typeof trazos;

interface Props {
  nombre: NombreIcono;
  color?: NombreColor;
  /** `icono` (16) en contenido, `iconoMenu` (20) en el menú inferior (05-ui §7). */
  tamano?: 'icono' | 'iconoMenu';
}

/** Decorativo: el texto de al lado dice lo mismo (U5). */
export function Icono({ nombre, color = 'texto', tamano = 'icono' }: Props) {
  const { colores, medidas } = useTema();
  const lado = medidas[tamano];

  return (
    <Svg width={lado} height={lado} viewBox="0 0 24 24" accessible={false} testID={`icono-${nombre}`}>
      <Path
        d={trazos[nombre]}
        testID={`icono-${nombre}-trazo`}
        stroke={colores[color]}
        // El trazo se dibuja en la caja de 24: se escala para medir `trazoIcono` en pantalla.
        strokeWidth={(medidas.trazoIcono * 24) / lado}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
