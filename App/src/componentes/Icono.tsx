import Svg, { Path } from 'react-native-svg';

import { useTema, type NombreColor } from '../tema';

// Íconos de trazo dibujados en una caja de 24 × 24 (05-ui §7). Se agregan solo cuando una spec
// los pide.
const trazos = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const;

export type NombreIcono = keyof typeof trazos;

interface Props {
  nombre: NombreIcono;
  color?: NombreColor;
}

/** Decorativo: el texto de al lado dice lo mismo (U5). */
export function Icono({ nombre, color = 'texto' }: Props) {
  const { colores, medidas } = useTema();

  return (
    <Svg
      width={medidas.icono}
      height={medidas.icono}
      viewBox="0 0 24 24"
      accessible={false}
      testID={`icono-${nombre}`}
    >
      <Path
        d={trazos[nombre]}
        stroke={colores[color]}
        // El trazo se dibuja en la caja de 24: se escala para medir `trazoIcono` en pantalla.
        strokeWidth={(medidas.trazoIcono * 24) / medidas.icono}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
