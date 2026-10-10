import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../tema';
import { Texto } from './Texto';

export interface DestinoMenu {
  clave: string;
  etiqueta: string;
}

interface Props {
  destinos: readonly DestinoMenu[];
  activo: string;
  onSeleccionar: (clave: string) => void;
}

/** Menú inferior de texto (05-ui §5): el destino activo en `texto` con barra superior en acento. */
export function MenuInferior({ destinos, activo, onSeleccionar }: Props) {
  const { colores, espacio, medidas } = useTema();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colores.superficie,
        borderTopWidth: medidas.linea,
        borderTopColor: colores.linea,
        paddingBottom: bottom,
      }}
    >
      {destinos.map(({ clave, etiqueta }) => {
        const seleccionado = clave === activo;
        return (
          <Pressable
            key={clave}
            onPress={() => onSeleccionar(clave)}
            accessibilityRole="tab"
            accessibilityLabel={etiqueta}
            accessibilityState={{ selected: seleccionado }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: medidas.areaTactil,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: espacio.s,
              borderTopWidth: medidas.barraActiva,
              borderTopColor: seleccionado ? colores.acento : 'transparent',
              opacity: pressed ? medidas.opacidadPresionado : 1,
            })}
          >
            <Texto variante="menu" color={seleccionado ? 'texto' : 'textoTenue'} numberOfLines={1}>
              {etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
