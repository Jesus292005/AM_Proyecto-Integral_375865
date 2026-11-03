import { Pressable, View } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props<T extends string> {
  pestanas: readonly { valor: T; titulo: string }[];
  activa: T;
  onCambiar: (valor: T) => void;
  deshabilitado?: boolean;
}

/** Pestañas internas en Teko; la activa con subrayado de 3 px en acento (05-ui §5). */
export function PestanasTexto<T extends string>({
  pestanas,
  activa,
  onCambiar,
  deshabilitado = false,
}: Props<T>) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: espacio.l,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.linea,
      }}
    >
      {pestanas.map(({ valor, titulo }) => {
        const esActiva = valor === activa;
        return (
          <Pressable
            key={valor}
            onPress={() => onCambiar(valor)}
            disabled={deshabilitado}
            accessibilityRole="tab"
            accessibilityLabel={titulo}
            accessibilityState={{ selected: esActiva, disabled: deshabilitado }}
            style={({ pressed }) => ({
              minHeight: medidas.areaTactil,
              justifyContent: 'center',
              borderBottomWidth: medidas.barraActiva,
              borderBottomColor: esActiva ? colores.acento : 'transparent',
              opacity: pressed ? medidas.opacidadPresionado : 1,
            })}
          >
            <Texto variante="pestana" color={esActiva ? 'texto' : 'textoTenue'} numberOfLines={1}>
              {titulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
