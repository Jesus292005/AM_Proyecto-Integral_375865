import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props {
  url: string | null;
  nombre: string;
  /** `fotoLista` (28) en listas y en la barra; `fotoPerfil` (72) en el encabezado de S09. */
  tamano?: 'fotoLista' | 'fotoPerfil';
}

/**
 * Foto de Google en círculo (F28 R1). Sin foto o si falla: círculo `superficie2` con la inicial en
 * Teko, como el respaldo de `EscudoEquipo` (F22 R3) y el ícono de grupo (D104). Decorativa: junto
 * a ella siempre va el nombre.
 */
export function FotoUsuario({ url, nombre, tamano = 'fotoLista' }: Props) {
  const { colores, medidas } = useTema();
  const lado = medidas[tamano];
  // Se guarda la URL que falló: si la fila pasa a otra persona, el estado no se arrastra.
  const [fallida, setFallida] = useState<string | null>(null);
  const circulo = {
    width: lado,
    height: lado,
    borderRadius: lado / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // También es el fondo mientras carga la foto (sin saltos).
    backgroundColor: colores.superficie2,
  } as const;

  if (url !== null && url !== '' && fallida !== url) {
    return (
      <View accessible={false} testID="foto-usuario" style={circulo}>
        <Image
          source={url}
          contentFit="cover"
          accessible={false}
          testID="foto-usuario-archivo"
          onError={() => setFallida(url)}
          style={{ width: lado, height: lado }}
        />
      </View>
    );
  }
  return (
    <View accessible={false} testID="foto-usuario-inicial" style={circulo}>
      <Texto variante={tamano === 'fotoPerfil' ? 'titulo1' : 'pestana'} color="texto2" numberOfLines={1}>
        {nombre.trim().charAt(0).toUpperCase() || '?'}
      </Texto>
    </View>
  );
}
