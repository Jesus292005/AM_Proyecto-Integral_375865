import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Metal } from '../tema';

/**
 * Fondo con el degradado de un metal (05-ui §2), en diagonal y ocupando todo su contenedor. Solo
 * para recompensas (U6): carta e insignias. Con `react-native-svg`, sin librería nueva (F20 R7).
 */
export function DegradadoMetal({ metal }: { metal: Metal }) {
  const id = `metal-${useId().replace(/:/g, '')}`;
  const [inicio, medio, fin] = metal.degradado;

  return (
    <Svg style={StyleSheet.absoluteFill} accessible={false} testID="degradado-metal">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={inicio} />
          <Stop offset="0.5" stopColor={medio} />
          <Stop offset="1" stopColor={fin} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
