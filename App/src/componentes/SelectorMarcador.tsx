import { View } from 'react-native';

import { useTema } from '../tema';
import { BotonIcono } from './BotonIcono';
import { Texto } from './Texto';

type Lado = 'local' | 'visitante';

interface Props {
  local: { nombre: string; goles: number };
  visitante: { nombre: string; goles: number };
  maximo: number;
  onCambiar: (lado: Lado, goles: number) => void;
  deshabilitado?: boolean;
}

function Equipo({
  nombre,
  goles,
  maximo,
  onCambiar,
  deshabilitado,
}: {
  nombre: string;
  goles: number;
  maximo: number;
  onCambiar: (goles: number) => void;
  deshabilitado: boolean;
}) {
  const { espacio } = useTema();

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: espacio.xs }}>
      <Texto variante="etiqueta" color="textoTenue" numberOfLines={1}>
        {nombre}
      </Texto>
      {/* A3: se reduce solo si no cabe, nunca se agranda. */}
      <Texto
        variante="marcadorXL"
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={`${nombre}: ${goles}`}
      >
        {String(goles)}
      </Texto>
      <View style={{ flexDirection: 'row', gap: espacio.xs }}>
        <BotonIcono
          etiqueta={`Un gol menos para ${nombre}`}
          simbolo="−"
          onPress={() => onCambiar(goles - 1)}
          deshabilitado={deshabilitado || goles <= 0}
        />
        <BotonIcono
          etiqueta={`Un gol más para ${nombre}`}
          simbolo="+"
          onPress={() => onCambiar(goles + 1)}
          deshabilitado={deshabilitado || goles >= maximo}
        />
      </View>
    </View>
  );
}

/** Dos números `marcadorXL` con − / +; 0 deshabilita "−" y el máximo deshabilita "+" (D72). */
export function SelectorMarcador({ local, visitante, maximo, onCambiar, deshabilitado = false }: Props) {
  const { espacio } = useTema();

  return (
    <View style={{ flexDirection: 'row', gap: espacio.m }}>
      <Equipo
        {...local}
        maximo={maximo}
        onCambiar={(goles) => onCambiar('local', goles)}
        deshabilitado={deshabilitado}
      />
      <Equipo
        {...visitante}
        maximo={maximo}
        onCambiar={(goles) => onCambiar('visitante', goles)}
        deshabilitado={deshabilitado}
      />
    </View>
  );
}
