import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTema, type NombreColor } from '../tema';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
  /** Muestra un indicador y bloquea el botón (evita intentos duplicados). */
  cargando?: boolean;
  accessibilityLabel?: string;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado = false,
  cargando = false,
  accessibilityLabel,
}: Props) {
  const { colores, espacio, medidas } = useTema();
  const bloqueado = deshabilitado || cargando;
  const primario = variante === 'primario';

  const colorTexto: NombreColor = deshabilitado ? 'textoTenue' : primario ? 'sobreAcento' : 'texto';
  const fondo = deshabilitado ? colores.superficie2 : primario ? colores.acento : 'transparent';
  const borde = deshabilitado ? colores.superficie2 : primario ? colores.acento : colores.linea;

  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: bloqueado, busy: cargando }}
      style={({ pressed }) => ({
        minHeight: medidas.altoBoton,
        borderRadius: medidas.radio,
        borderWidth: medidas.linea,
        borderColor: borde,
        backgroundColor: fondo,
        paddingHorizontal: espacio.l,
        justifyContent: 'center',
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio.xs }}
      >
        {cargando && <ActivityIndicator color={colores[colorTexto]} testID="boton-cargando" />}
        <Texto variante="titulo2" color={colorTexto}>
          {titulo}
        </Texto>
      </View>
    </Pressable>
  );
}
