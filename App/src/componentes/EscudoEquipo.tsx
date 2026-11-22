import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

/** Lo que el escudo necesita de un equipo (columnas de `equipo`). */
export type EquipoConEscudo = {
  nombre_corto: string;
  escudo_url: string;
  color_primario: string | null;
  color_texto: string | null;
};

interface Props {
  equipo: EquipoConEscudo;
  /** `escudoLista` (28) en S02, `escudoEncabezado` (44) en S03 (05-ui §4). */
  tamano: 'escudoLista' | 'escudoEncabezado';
}

/**
 * Escudo de la API con caché (`expo-image`, D86). Sin URL o si la imagen falla: círculo con la
 * inicial del nombre corto en los colores del equipo, o neutro si no tiene colores (F22 R3).
 * Decorativo: la fila o el encabezado ya dicen el nombre del equipo.
 */
export function EscudoEquipo({ equipo, tamano }: Props) {
  const { colores, medidas } = useTema();
  const lado = medidas[tamano];
  const url = equipo.escudo_url.trim();
  // Se guarda la URL que cargó o falló: si la fila pasa a otro equipo, el estado no se arrastra.
  const [cargada, setCargada] = useState<string | null>(null);
  const [fallida, setFallida] = useState<string | null>(null);
  const conImagen = url !== '' && fallida !== url;
  const { color_primario: primario, color_texto: texto } = equipo;
  const colorEquipo = primario !== null && texto !== null ? { primario, texto } : null;

  const circulo = {
    width: lado,
    height: lado,
    borderRadius: lado / 2,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  if (conImagen) {
    return (
      <View
        accessible={false}
        testID="escudo-imagen"
        // Mientras carga: círculo `superficie2` del mismo tamaño, sin saltos (F22 Estados). Ya
        // cargado, el escudo se ve completo (sin recortarlo en círculo).
        style={
          cargada === url
            ? { width: lado, height: lado }
            : { ...circulo, backgroundColor: colores.superficie2 }
        }
      >
        <Image
          source={url}
          contentFit="contain"
          accessible={false}
          testID="escudo-archivo"
          onLoad={() => setCargada(url)}
          onError={() => setFallida(url)}
          style={{ width: lado, height: lado }}
        />
      </View>
    );
  }

  return (
    <View
      accessible={false}
      testID="escudo-respaldo"
      style={{
        ...circulo,
        backgroundColor: colorEquipo?.primario ?? colores.superficie2,
      }}
    >
      <Texto
        variante={tamano === 'escudoLista' ? 'pestana' : 'titulo2'}
        color="textoTenue"
        colorDato={colorEquipo?.texto}
        numberOfLines={1}
      >
        {equipo.nombre_corto.trim().charAt(0).toUpperCase()}
      </Texto>
    </View>
  );
}
