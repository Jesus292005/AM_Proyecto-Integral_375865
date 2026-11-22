import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export interface DestinoMenu {
  clave: string;
  etiqueta: string;
  icono: NombreIcono;
}

interface Props {
  destinos: readonly DestinoMenu[];
  activo: string;
  onSeleccionar: (clave: string) => void;
}

/**
 * Menú inferior (05-ui §5, F22 R1): ícono encima del texto; el destino activo en `texto` con barra
 * superior en acento, los demás en `textoTenue`.
 */
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
      {destinos.map(({ clave, etiqueta, icono }) => {
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
              gap: espacio.xxs,
              paddingVertical: espacio.s,
              borderTopWidth: medidas.barraActiva,
              borderTopColor: seleccionado ? colores.acento : 'transparent',
              opacity: pressed ? medidas.opacidadPresionado : 1,
            })}
          >
            <Icono nombre={icono} tamano="iconoMenu" color={seleccionado ? 'texto' : 'textoTenue'} />
            <Texto variante="menu" color={seleccionado ? 'texto' : 'textoTenue'} numberOfLines={1}>
              {etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
