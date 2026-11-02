import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoSinConexion, Esqueleto, EstadoPantalla, Texto } from '../componentes';
import { useTema } from '../tema';
import { agruparPorDia, elegirJornada } from './agruparPorDia';
import { ErrorDatos, obtenerPartidosDeJornada, obtenerTorneoActual } from './datos';
import { FilaPartido } from './FilaPartido';
import { SelectorJornada } from './SelectorJornada';

const mensajes = {
  // F02 B6.
  vacio: 'No hay partidos en esta jornada.',
  // Mismos textos que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  error: 'No pudimos cargar los partidos. Inténtalo de nuevo.',
} as const;

function esSinConexion(error: unknown): boolean {
  return error instanceof ErrorDatos && error.sinConexion;
}

function EsqueletoPartidos() {
  const { colores, espacio, medidas } = useTema();

  return (
    <View testID="partidos-cargando" style={{ paddingTop: espacio.l, gap: espacio.xs }}>
      <Esqueleto variante="etiqueta" ancho="30%" />
      {[0, 1, 2, 3, 4].map((fila) => (
        <View
          key={fila}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.s,
            paddingVertical: espacio.s,
            borderBottomWidth: medidas.linea,
            borderBottomColor: colores.lineaSuave,
          }}
        >
          <View style={{ flex: 1 }}>
            <Esqueleto variante="cuerpoFuerte" ancho="70%" />
          </View>
          <Esqueleto variante="numero" ancho="15%" />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Esqueleto variante="cuerpoFuerte" ancho="70%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** S02: partidos de una jornada con selector de jornada y todos los estados (F02 parte B). */
export function PantallaPartidos() {
  const { jornada } = useLocalSearchParams<'/partidos'>();
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);

  const torneo = useQuery({ queryKey: ['torneo-actual'], queryFn: obtenerTorneoActual });
  const jornadas = torneo.data?.jornadas ?? [];
  const elegida = elegirJornada(
    jornadas,
    typeof jornada === 'string' ? jornada : undefined,
    torneo.data?.ordenActual ?? null,
  );
  const partidos = useQuery({
    queryKey: ['partidos-de-jornada', elegida?.id],
    queryFn: () => (elegida ? obtenerPartidosDeJornada(elegida.id) : Promise.resolve([])),
    enabled: elegida !== undefined,
  });

  // Cambiar de jornada actualiza esta misma pantalla, sin agregar historial (D78).
  const indice = elegida ? jornadas.indexOf(elegida) : -1;
  const anterior = indice > 0 ? jornadas[indice - 1] : undefined;
  const siguiente = indice >= 0 ? jornadas[indice + 1] : undefined;
  const irA = (orden: number) => () => router.setParams({ jornada: String(orden) });

  async function recargar() {
    setRefrescando(true);
    await Promise.all([torneo.refetch(), partidos.refetch()]);
    setRefrescando(false);
  }

  const error = (causa: unknown, reintentar: () => unknown) => (
    <EstadoPantalla
      mensaje={esSinConexion(causa) ? mensajes.sinConexion : mensajes.error}
      accion={{ titulo: 'Reintentar', onPress: () => void reintentar() }}
    />
  );

  // Lo que se muestra cuando no hay lista (B6).
  let estado: ReactNode = null;
  if (torneo.isPending) estado = <EsqueletoPartidos />;
  else if (torneo.isError && torneo.data === undefined) estado = error(torneo.error, torneo.refetch);
  else if (elegida === undefined) estado = <EstadoPantalla mensaje={mensajes.vacio} />;
  else if (partidos.isPending) estado = <EsqueletoPartidos />;
  else if (partidos.isError && partidos.data === undefined) {
    estado = error(partidos.error, partidos.refetch);
  } else if (partidos.data.length === 0) estado = <EstadoPantalla mensaje={mensajes.vacio} />;

  const dias = estado === null && partidos.data ? agruparPorDia(partidos.data) : [];

  // Error al actualizar con datos ya cargados: se siguen mostrando, con aviso (B6).
  const fallida = [partidos, torneo].find((consulta) => consulta.isRefetchError);
  const aviso = fallida && (
    <AvisoSinConexion
      actualizadoEn={new Date(fallida.dataUpdatedAt)}
      sinConexion={esSinConexion(fallida.error)}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View style={{ paddingHorizontal: medidas.margenPantalla, gap: espacio.s }}>
        {torneo.data && elegida && (
          <SelectorJornada
            nombre={elegida.nombre}
            torneo={torneo.data.nombre}
            onAnterior={anterior && irA(anterior.orden)}
            onSiguiente={siguiente && irA(siguiente.orden)}
          />
        )}
        {aviso}
      </View>
      <SectionList
        testID="lista-partidos"
        sections={dias}
        keyExtractor={(partido) => String(partido.id)}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingTop: espacio.l,
              paddingBottom: espacio.xs,
              borderBottomWidth: medidas.linea,
              borderBottomColor: colores.linea,
            }}
          >
            <Texto variante="etiqueta" color="textoTenue">
              {section.titulo}
            </Texto>
          </View>
        )}
        renderItem={({ item }) => (
          <FilaPartido
            partido={item}
            onPress={() =>
              router.navigate({
                pathname: '/partido/[partidoId]',
                params: { partidoId: String(item.id) },
              })
            }
          />
        )}
        ListEmptyComponent={estado}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => void recargar()}
            colors={[colores.acento]}
            tintColor={colores.acento}
            progressBackgroundColor={colores.superficie}
          />
        }
      />
    </SafeAreaView>
  );
}
