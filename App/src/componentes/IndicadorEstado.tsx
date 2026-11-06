import { View } from 'react-native';

import { type NombreColor, useTema } from '../tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

// 05-ui §5: círculo con ícono + texto, en el color del estado. El color nunca va solo (U5).

export type EstadoIndicador = 'acertada' | 'parcial' | 'fallada' | 'pendiente' | 'noVerificable';

const apariencia: Record<EstadoIndicador, { color: NombreColor; icono: NombreIcono }> = {
  acertada: { color: 'acierto', icono: 'check' },
  parcial: { color: 'parcial', icono: 'aprox' },
  fallada: { color: 'fallo', icono: 'equis' },
  pendiente: { color: 'pendiente', icono: 'puntos' },
  noVerificable: { color: 'textoTenue', icono: 'guion' },
};

interface Props {
  estado: EstadoIndicador;
  /** Texto junto al círculo; sin él, el ícono es el que distingue el estado. */
  texto?: string;
}

export function IndicadorEstado({ estado, texto }: Props) {
  const { colores, espacio, medidas } = useTema();
  const { color, icono } = apariencia[estado];
  const diametro = medidas.icono + espacio.xxs;

  return (
    <View
      testID={`indicador-${estado}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs }}
    >
      <View
        style={{
          width: diametro,
          height: diametro,
          borderRadius: diametro / 2,
          borderWidth: medidas.linea,
          borderColor: colores[color],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icono nombre={icono} color={color} />
      </View>
      {texto !== undefined && (
        <Texto variante="meta" color={color}>
          {texto}
        </Texto>
      )}
    </View>
  );
}
