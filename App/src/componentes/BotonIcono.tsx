import { Pressable } from 'react-native';

import { useTema } from '../tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

type Contenido =
  /** Símbolo de texto (− / +, ‹ ›). */
  | { simbolo: string; icono?: never }
  /** Ícono de trazo (05-ui §7), p. ej. `mas` en S04 o `lapiz` en S08 (v2.7). */
  | { icono: NombreIcono; simbolo?: never };

type Props = Contenido & {
  /** Siempre obligatorio: el botón no tiene texto visible (05-ui §5). */
  etiqueta: string;
  onPress: () => void;
  deshabilitado?: boolean;
};

/** Botón cuadrado de 44 × 44 con borde `linea` y radio 4 (05-ui §5). */
export function BotonIcono({ etiqueta, simbolo, icono, onPress, deshabilitado = false }: Props) {
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
      {icono !== undefined ? (
        <Icono nombre={icono} color={deshabilitado ? 'linea' : 'texto'} tamano="iconoMenu" />
      ) : (
        <Texto variante="titulo2" color={deshabilitado ? 'linea' : 'texto'}>
          {simbolo}
        </Texto>
      )}
    </Pressable>
  );
}
