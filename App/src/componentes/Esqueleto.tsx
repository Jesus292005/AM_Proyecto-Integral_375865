import { type DimensionValue, View } from 'react-native';

import { useTema, type VarianteTexto } from '../tema';

interface Props {
  /** Alto de una línea del token tipográfico al que reemplaza. */
  variante: VarianteTexto;
  /** Ancho relativo (05-ui A1: nada de anchos fijos). */
  ancho: DimensionValue;
}

/** Barra `superficie` con la forma del contenido mientras carga (05-ui §6). */
export function Esqueleto({ variante, ancho }: Props) {
  const { colores, medidas, tipografia } = useTema();

  return (
    <View
      style={{
        height: tipografia[variante].lineHeight,
        width: ancho,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
      }}
    />
  );
}
