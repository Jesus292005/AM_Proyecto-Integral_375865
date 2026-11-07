import { Image } from 'expo-image';
import { View } from 'react-native';

import { Texto } from '../componentes';
import { useTema } from '../tema';

/** Foto circular de Google en listas; sin foto, la inicial (decorativa: la fila dice el nombre). */
export function FotoUsuario({ url, nombre }: { url: string | null; nombre: string }) {
  const { colores, medidas } = useTema();
  const forma = {
    width: medidas.fotoLista,
    height: medidas.fotoLista,
    borderRadius: medidas.fotoLista / 2,
  };

  if (url !== null) {
    return <Image source={url} contentFit="cover" accessible={false} style={forma} />;
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ ...forma, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.superficie2 }}
    >
      <Texto variante="meta" color="texto2">
        {nombre.trim().charAt(0).toUpperCase()}
      </Texto>
    </View>
  );
}
