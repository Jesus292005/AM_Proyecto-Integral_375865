import { Pressable, View } from 'react-native';

import { useTema } from '../tema';
import { Icono } from './Icono';
import { Texto } from './Texto';

interface Props<T extends string> {
  /** Nombre del grupo para lectores de pantalla. */
  nombre: string;
  opciones: readonly { valor: T; titulo: string }[];
  elegida: T | null;
  /** Tocar la elegida la quita: el grupo se puede dejar sin elegir (F03 Flujo 2). */
  onElegir: (valor: T | null) => void;
  deshabilitado?: boolean;
}

/**
 * Fila de botones `secundario`; la elegida en `superficie2` con borde `acento` y check
 * (05-ui §5, F03).
 */
export function Opciones<T extends string>({
  nombre,
  opciones,
  elegida,
  onElegir,
  deshabilitado = false,
}: Props<T>) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={nombre}
      style={{ flexDirection: 'row', gap: espacio.xs }}
    >
      {opciones.map(({ valor, titulo }) => {
        const esElegida = valor === elegida;
        return (
          <Pressable
            key={valor}
            onPress={() => onElegir(esElegida ? null : valor)}
            disabled={deshabilitado}
            accessibilityRole="radio"
            accessibilityLabel={titulo}
            accessibilityState={{ checked: esElegida, disabled: deshabilitado }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: espacio.xxs,
              minHeight: medidas.areaTactil,
              paddingHorizontal: espacio.xxs,
              borderRadius: medidas.radio,
              borderWidth: medidas.linea,
              borderColor: esElegida ? colores.acento : colores.linea,
              backgroundColor: esElegida ? colores.superficie2 : 'transparent',
              opacity: pressed ? medidas.opacidadPresionado : 1,
            })}
          >
            {esElegida && <Icono nombre="check" color="acento" />}
            <Texto
              variante="cuerpoFuerte"
              color={deshabilitado && !esElegida ? 'textoTenue' : 'texto'}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {titulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
