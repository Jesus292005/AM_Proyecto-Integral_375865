import { Pressable } from 'react-native';

import { useTema } from '../tema';
import { Icono } from './Icono';
import { Texto } from './Texto';

interface Props {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
}

/**
 * Botón compacto de filtro (05-ui §5, F23 R4): alto `altoChip` con área táctil de 44; activo en
 * `superficie2` con borde de acento y check (el estado no va solo en el color, U5).
 */
export function ChipFiltro({ etiqueta, activo, onPress }: Props) {
  const { colores, espacio, medidas } = useTema();
  // Lo que falta para llegar al área táctil mínima, repartido arriba y abajo.
  const margenTactil = (medidas.areaTactil - medidas.altoChip) / 2;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: margenTactil, bottom: margenTactil }}
      accessibilityRole="checkbox"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: activo }}
      style={({ pressed }) => ({
        height: medidas.altoChip,
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.xxs,
        paddingHorizontal: espacio.s,
        borderRadius: medidas.radio,
        borderWidth: medidas.linea,
        borderColor: activo ? colores.acento : colores.linea,
        backgroundColor: activo ? colores.superficie2 : undefined,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <Icono nombre="filtro" color={activo ? 'texto' : 'texto2'} />
      <Texto variante="meta" color={activo ? 'texto' : 'texto2'} numberOfLines={1}>
        {etiqueta}
      </Texto>
      {activo && <Icono nombre="check" color="acento" />}
    </Pressable>
  );
}
