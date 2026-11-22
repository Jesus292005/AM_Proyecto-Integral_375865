import { Pressable } from 'react-native';

import { useTema } from '../tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

interface Props {
  icono: NombreIcono;
  /** Nombre de la reacción para el lector de pantalla (U8); el ícono va sin texto. */
  etiqueta: string;
  conteo: number;
  /** La mía: `superficie2` con borde `acento`, y el estado seleccionado (U5). */
  activa: boolean;
  deshabilitada?: boolean;
  onPress: () => void;
}

/**
 * Reacción a un análisis del muro (05-ui v2.7, F26 R14): como `ChipFiltro`, alto `altoChip` con
 * área táctil de 44, ícono de trazo (U7: nada de emojis) y el conteo en `meta`.
 */
export function ChipReaccion({ icono, etiqueta, conteo, activa, deshabilitada = false, onPress }: Props) {
  const { colores, espacio, medidas } = useTema();
  const margenTactil = (medidas.areaTactil - medidas.altoChip) / 2;
  const color = deshabilitada ? 'textoTenue' : activa ? 'texto' : 'texto2';

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      hitSlop={{ top: margenTactil, bottom: margenTactil }}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}, ${conteo}`}
      accessibilityState={{ selected: activa, disabled: deshabilitada }}
      style={({ pressed }) => ({
        height: medidas.altoChip,
        minWidth: medidas.areaTactil,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: espacio.xxs,
        paddingHorizontal: espacio.xs,
        borderRadius: medidas.radio,
        borderWidth: medidas.linea,
        borderColor: activa ? colores.acento : colores.linea,
        backgroundColor: activa ? colores.superficie2 : undefined,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <Icono nombre={icono} color={activa ? 'acento' : color} />
      <Texto variante="meta" color={color}>
        {String(conteo)}
      </Texto>
    </Pressable>
  );
}
