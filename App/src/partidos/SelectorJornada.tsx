import { View } from 'react-native';

import { BotonIcono, Texto } from '../componentes';
import { useTema } from '../tema';

interface Props {
  nombre: string;
  torneo: string;
  onAnterior?: () => void;
  onSiguiente?: () => void;
}

/** "‹ JORNADA 10 ›": sin `onAnterior`/`onSiguiente` (extremos) la flecha se deshabilita (CA10). */
export function SelectorJornada({ nombre, torneo, onAnterior, onSiguiente }: Props) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.s,
        paddingVertical: espacio.s,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.linea,
      }}
    >
      <BotonIcono
        etiqueta="Jornada anterior"
        simbolo="‹"
        onPress={() => onAnterior?.()}
        deshabilitado={onAnterior === undefined}
      />
      <View style={{ flex: 1, alignItems: 'center', gap: espacio.xxs }}>
        <Texto variante="titulo2" alineacion="center" numberOfLines={1} accessibilityRole="header">
          {nombre}
        </Texto>
        <Texto variante="meta" color="textoTenue" numberOfLines={1}>
          {torneo}
        </Texto>
      </View>
      <BotonIcono
        etiqueta="Jornada siguiente"
        simbolo="›"
        onPress={() => onSiguiente?.()}
        deshabilitado={onSiguiente === undefined}
      />
    </View>
  );
}
