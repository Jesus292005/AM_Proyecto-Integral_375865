import { View } from 'react-native';

import { useTema } from '../tema';
import { DegradadoMetal } from './DegradadoMetal';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export type MetalInsignia = 'bronce' | 'plata' | 'oro';

interface Props {
  nombre: string;
  metal: MetalInsignia;
  icono: NombreIcono;
  /** Sin ganar: `bloqueada`, en `superficie2` con "?" (05-ui §5). */
  bloqueada: boolean;
  /** Veces ganada; "×n" solo si es más de una. */
  veces: number;
}

/**
 * Medalla circular con el degradado de su metal y su ícono, con el nombre debajo (05-ui §5, U6).
 * Decorativa para el lector de pantalla: quien la usa pone la etiqueta completa.
 */
export function Insignia({ nombre, metal, icono, bloqueada, veces }: Props) {
  const { colores, metales, espacio, medidas } = useTema();
  const lado = medidas.medallaInsignia;

  return (
    <View style={{ alignItems: 'center', gap: espacio.xxs }}>
      <View
        testID={bloqueada ? 'medalla-bloqueada' : 'medalla'}
        style={{
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bloqueada ? colores.superficie2 : undefined,
        }}
      >
        {bloqueada ? (
          <Texto variante="titulo2" color="textoTenue">
            ?
          </Texto>
        ) : (
          <>
            <DegradadoMetal metal={metales[metal]} />
            <Icono nombre={icono} colorDato={metales[metal].texto} tamano="iconoMenu" />
          </>
        )}
      </View>
      <Texto
        variante="meta"
        color={bloqueada ? 'textoTenue' : 'texto'}
        alineacion="center"
        numberOfLines={2}
      >
        {nombre}
      </Texto>
      {veces > 1 && (
        <Texto variante="etiqueta" color="texto2">
          {`×${veces}`}
        </Texto>
      )}
    </View>
  );
}
