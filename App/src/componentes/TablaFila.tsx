import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTema } from '../tema';

interface Props {
  /** Las columnas de la fila; los números van alineados a la derecha. */
  children: ReactNode;
  /** "Tú": fondo `superficie2` (05-ui §5). */
  resaltada?: boolean;
  /** Con acción, la fila es un botón. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Fila de tabla con línea suave inferior (05-ui §4, §5). */
export function TablaFila({ children, resaltada = false, onPress, accessibilityLabel }: Props) {
  const { colores, espacio, medidas } = useTema();
  const estilo = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    minHeight: medidas.areaTactil,
    paddingVertical: espacio.xs,
    paddingHorizontal: espacio.xs,
    borderBottomWidth: medidas.linea,
    borderBottomColor: colores.lineaSuave,
    backgroundColor: resaltada ? colores.superficie2 : 'transparent',
  } as const;

  if (onPress === undefined) {
    return (
      <View style={estilo} accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({ ...estilo, opacity: pressed ? medidas.opacidadPresionado : 1 })}
    >
      {children}
    </Pressable>
  );
}
