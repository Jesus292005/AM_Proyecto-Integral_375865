import { Pressable } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props {
  /** Siempre obligatorio: el botón no tiene texto visible (05-ui §5). */
  etiqueta: string;
  /** Símbolo de texto; pasa a ícono SVG cuando se instale react-native-svg (F12). */
  simbolo: string;
  onPress: () => void;
  deshabilitado?: boolean;
}

/** Botón cuadrado de 44 × 44 con borde `linea` y radio 4 (05-ui §5). */
export function BotonIcono({ etiqueta, simbolo, onPress, deshabilitado = false }: Props) {
  const { colores, medidas } = useTema();

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => ({
        width: medidas.areaTactil,
        height: medidas.areaTactil,
        borderRadius: medidas.radio,
        borderWidth: medidas.linea,
        borderColor: deshabilitado ? colores.lineaSuave : colores.linea,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <Texto variante="titulo2" color={deshabilitado ? 'linea' : 'texto'}>
        {simbolo}
      </Texto>
    </Pressable>
  );
}
