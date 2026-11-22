import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Boton, Seccion, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';

/** Lo que un bloque necesita de una consulta (`useQuery` lo cumple). */
export interface Consulta<T> {
  data: T | undefined;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Junta dos consultas: hay datos cuando están los dos; falla si falla cualquiera. */
export function combinar<A, B>(a: Consulta<A>, b: Consulta<B>): Consulta<[A, B]> {
  const faltaA = a.isError && a.data === undefined;
  return {
    data: a.data !== undefined && b.data !== undefined ? [a.data, b.data] : undefined,
    isError: faltaA || (b.isError && b.data === undefined),
    // El error de la consulta que no tiene datos.
    error: faltaA ? a.error : b.error,
    refetch: () => Promise.all([a.refetch(), b.refetch()]),
  };
}

export const mensajesInicio = {
  sinTorneo: 'No hay un torneo en curso.',
  error: 'No se pudo cargar.',
  sinConexion: 'Sin conexión.',
  // Una sola vez arriba de los bloques (F17, estados); mismo texto que F01 §10.
  avisoSinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
} as const;

interface Props<T> {
  etiqueta: string;
  /** Prefijo de los `testID`: `<id>`, `<id>-cargando` y `<id>-error`. */
  id: string;
  consulta: Consulta<T>;
  /** Forma del contenido mientras carga (F17, estados). */
  esqueleto: ReactNode;
  /** Sin torneo actual, los bloques 1–4 lo dicen en lugar de su contenido. */
  sinTorneo?: boolean;
  children: (datos: T) => ReactNode;
}

/**
 * Un bloque de S11 (F17 R1): su propia consulta y sus estados. Un error se queda dentro del bloque,
 * con "Reintentar", y no afecta a los demás.
 */
export function BloqueInicio<T>({ etiqueta, id, consulta, esqueleto, sinTorneo = false, children }: Props<T>) {
  const { espacio } = useTema();

  let contenido: ReactNode;
  if (sinTorneo) {
    contenido = <Texto variante="cuerpo">{mensajesInicio.sinTorneo}</Texto>;
  } else if (consulta.data !== undefined) {
    contenido = children(consulta.data);
  } else if (consulta.isError) {
    contenido = (
      <View testID={`${id}-error`} style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(consulta.error) ? mensajesInicio.sinConexion : mensajesInicio.error}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void consulta.refetch()} />
      </View>
    );
  } else {
    contenido = <View testID={`${id}-cargando`}>{esqueleto}</View>;
  }

  return (
    <View testID={id}>
      <Seccion etiqueta={etiqueta}>{contenido}</Seccion>
    </View>
  );
}
