import { Pressable, View } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props {
  /** Si se omite, el encabezado no muestra "← volver". */
  onVolver?: () => void;
  /** Metadato a la derecha. */
  meta?: string;
}

/** Fila con "← volver" y metadato a la derecha, con línea inferior (05-ui §5). */
export function EncabezadoPantalla({ onVolver, meta }: Props) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: espacio.s,
        minHeight: medidas.areaTactil,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.linea,
      }}
    >
      {onVolver ? (
        <Pressable
          onPress={onVolver}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={espacio.xs}
          style={({ pressed }) => ({
            minHeight: medidas.areaTactil,
            justifyContent: 'center',
            opacity: pressed ? medidas.opacidadPresionado : 1,
          })}
        >
          {/* Flecha de texto; pasa al ícono SVG "volver" cuando se instale react-native-svg (F12). */}
          <Texto variante="menu">← Volver</Texto>
        </Pressable>
      ) : (
        <View />
      )}
      {meta !== undefined && (
        <Texto variante="meta" color="textoTenue" numberOfLines={1}>
          {meta}
        </Texto>
      )}
    </View>
  );
}
