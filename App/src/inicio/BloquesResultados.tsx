import { router } from 'expo-router';
import { View } from 'react-native';

import { Boton, Esqueleto, TablaFila, Texto } from '../componentes';
import type { MiGrupo } from '../grupos/datos';
import { useTema } from '../tema';
import { BloqueInicio, type Consulta } from './BloqueInicio';
import type { MejorAnalisis, UltimaJornada } from './datos';

// Bloques 3, 4 y 5 de S11 (F17 R8–R12).

export const mensajesResultados = {
  sinCalificados: 'Aún no hay partidos calificados en este torneo.',
  sinGruposAnalisis: 'Únete a un grupo para ver el mejor análisis de la jornada.',
  nadieLlego: (jornada: string | null) =>
    jornada === null ? 'Nadie de tus grupos llegó a 50 en esta jornada.' : `Nadie de tus grupos llegó a 50 en la ${jornada}.`,
  sinGrupos: 'Compite con tus amigos en un grupo.',
} as const;

const textoMiembros = (n: number) => (n === 1 ? '1 miembro' : `${n} miembros`);

function EsqueletoFilas({ filas }: { filas: number }) {
  const { espacio } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} variante="cuerpoFuerte" ancho="80%" />
      ))}
    </View>
  );
}

/** Bloque 3 · Mi última jornada (R8–R9). */
export function BloqueUltimaJornada({
  consulta,
  sinTorneo,
}: {
  consulta: Consulta<UltimaJornada | null>;
  sinTorneo: boolean;
}) {
  const { espacio } = useTema();

  return (
    <BloqueInicio
      etiqueta="Mi última jornada"
      id="bloque-ultima-jornada"
      consulta={consulta}
      sinTorneo={sinTorneo}
      esqueleto={
        <View style={{ gap: espacio.s }}>
          <Esqueleto variante="marcadorXL" ancho="30%" />
          <EsqueletoFilas filas={2} />
        </View>
      }
    >
      {(jornada) =>
        jornada === null ? (
          <Texto variante="cuerpo">{mensajesResultados.sinCalificados}</Texto>
        ) : (
          <View style={{ gap: espacio.xs }}>
            <Texto variante="cuerpoFuerte">{jornada.jornada_nombre}</Texto>
            <Texto variante="marcadorXL">{String(jornada.puntos_total)}</Texto>
          </View>
        )
      }
    </BloqueInicio>
  );
}

/** Bloque 4 · Mejor análisis de la jornada en mis grupos (R10–R11). */
export function BloqueMejorAnalisis({
  consulta,
  grupos,
  sinTorneo,
}: {
  consulta: Consulta<MejorAnalisis | null>;
  /** Solo para el vacío "Únete a un grupo…": si no llegaron, el bloque no falla por eso (R1). */
  grupos: MiGrupo[] | undefined;
  sinTorneo: boolean;
}) {
  const { espacio } = useTema();

  return (
    <BloqueInicio
      etiqueta="Mejor análisis de la jornada"
      id="bloque-mejor-analisis"
      consulta={consulta}
      sinTorneo={sinTorneo}
      esqueleto={<EsqueletoFilas filas={3} />}
    >
      {(analisis) => {
        if (analisis === null) {
          return (
            <Texto variante="cuerpo">
              {grupos?.length === 0 ? mensajesResultados.sinGruposAnalisis : mensajesResultados.nadieLlego(null)}
            </Texto>
          );
        }
        return (
          <View style={{ gap: espacio.xs }}>
            <Texto variante="cuerpoFuerte">{analisis.es_yo ? 'Tú' : analisis.nombre}</Texto>
            <Texto variante="titulo2">{`${analisis.puntos_bono}/100`}</Texto>
          </View>
        );
      }}
    </BloqueInicio>
  );
}

/** Bloque 5 · Mis grupos con mi posición (R12). */
export function BloqueGrupos({ consulta }: { consulta: Consulta<MiGrupo[]> }) {
  const { espacio } = useTema();

  return (
    <BloqueInicio etiqueta="Mis grupos" id="bloque-grupos" consulta={consulta} esqueleto={<EsqueletoFilas filas={2} />}>
      {(grupos) =>
        grupos.length === 0 ? (
          <View style={{ gap: espacio.s }}>
            <Texto variante="cuerpo">{mensajesResultados.sinGrupos}</Texto>
            <Boton titulo="Crear grupo" onPress={() => router.navigate('/grupos/nuevo')} />
            <Boton titulo="Unirse" variante="secundario" onPress={() => router.navigate('/grupos/unirse')} />
          </View>
        ) : (
          <View>
            {grupos.map((grupo) => (
              <TablaFila
                key={grupo.id}
                accessibilityLabel={grupo.nombre}
                onPress={() =>
                  router.navigate({ pathname: '/grupo/[grupoId]', params: { grupoId: String(grupo.id) } })
                }
              >
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpoFuerte" numberOfLines={1}>
                    {grupo.nombre}
                  </Texto>
                  <Texto variante="meta" color="textoTenue">
                    {textoMiembros(grupo.miembros)}
                  </Texto>
                </View>
              </TablaFila>
            ))}
          </View>
        )
      }
    </BloqueInicio>
  );
}
