import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props {
  etiqueta: string;
  children: ReactNode;
}

/** Etiqueta + contenido + línea inferior (05-ui §5). */
export function Seccion({ etiqueta, children }: Props) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      style={{
        gap: espacio.s,
        paddingBottom: espacio.l,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.linea,
      }}
    >
      <Texto variante="etiqueta" color="textoTenue">
        {etiqueta}
      </Texto>
      {children}
    </View>
  );
}
