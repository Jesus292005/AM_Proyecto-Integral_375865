import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoSinConexion, ChipFiltro, Esqueleto, EstadoPantalla, Texto } from '../componentes';
import { useTema } from '../tema';
import { agruparPorDia, elegirJornada } from './agruparPorDia';
import { esSinConexion } from '../datos/errores';
import { prediccionAbierta } from '../partido/eleccion';
import { obtenerMisPuntos } from '../puntos/datos';
import { obtenerPartidosDeJornada, obtenerTorneoActual } from './datos';
import { FilaPartido } from './FilaPartido';
import { EsqueletoTira, TiraJornadas } from './TiraJornadas';

const mensajes = {
  // F02 B6.
  vacio: 'No hay partidos en esta jornada.',
  // F23 R5.
  sinPendientes: 'Ya predijiste todo lo que se puede en esta jornada.',
  // Mismos textos que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  error: 'No pudimos cargar los partidos. Inténtalo de nuevo.',
} as const;

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

/** S02: partidos de una jornada con la tira de jornadas (F23) y todos los estados (F02 parte B). */
export function PantallaPartidos() {
  const { jornada } = useLocalSearchParams<'/partidos'>();
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);
  // "Sin predecir" (F23 R4): sigue al cambiar de jornada y se apaga al salir de la pestaña (no va
  // en la ruta). Abrir un partido no sale de la pestaña: el filtro sigue al volver.
  const [sinPredecir, setSinPredecir] = useState(false);
  const navigation = useNavigation();
  useEffect(() => navigation.getParent()?.addListener('blur', () => setSinPredecir(false)), [navigation]);

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

  // F10 R3: mis puntos de los partidos predichos. Si fallan, las filas se ven sin puntos.
  const predichos = (partidos.data ?? []).filter((p) => p.predicho).map((p) => p.id);
  const misPuntos = useQuery({
    queryKey: ['mis-puntos', 'jornada', elegida?.id, predichos.join(',')],
    queryFn: () => obtenerMisPuntos(predichos),
    enabled: predichos.length > 0,
  });

  // Cambiar de jornada actualiza esta misma pantalla, sin agregar historial (D78, F23 R3).
  const irA = (orden: number) => router.setParams({ jornada: String(orden) });

  async function recargar() {
    setRefrescando(true);
    await Promise.all([torneo.refetch(), partidos.refetch(), misPuntos.refetch()]);
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

  // Por jugar, abiertos y sin mi predicción, sobre lo ya cargado (F23 R4, R6).
  const ahora = new Date();
  const visibles = sinPredecir
    ? (partidos.data ?? []).filter((p) => !p.predicho && prediccionAbierta(p, ahora))
    : (partidos.data ?? []);
  if (estado === null && visibles.length === 0) {
    estado = (
      <EstadoPantalla
        mensaje={mensajes.sinPendientes}
        accion={{ titulo: 'Ver todos', onPress: () => setSinPredecir(false) }}
      />
    );
  }

  const dias = estado === null ? agruparPorDia(visibles) : [];

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
        {torneo.isPending && <EsqueletoTira />}
        {torneo.data && elegida && (
          <View
            style={{
              gap: espacio.s,
              paddingVertical: espacio.s,
              borderBottomWidth: medidas.linea,
              borderBottomColor: colores.linea,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
              <View style={{ flex: 1, gap: espacio.xxs }}>
                <Texto variante="titulo2" numberOfLines={1} accessibilityRole="header">
                  {elegida.nombre}
                </Texto>
                <Texto variante="meta" color="textoTenue" numberOfLines={1}>
                  {torneo.data.nombre}
                </Texto>
              </View>
              <ChipFiltro
                etiqueta="Sin predecir"
                activo={sinPredecir}
                onPress={() => setSinPredecir((activo) => !activo)}
              />
            </View>
            <TiraJornadas
              jornadas={jornadas}
              elegida={elegida.orden}
              actual={torneo.data.ordenActual}
              onElegir={irA}
            />
          </View>
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
            puntos={misPuntos.data?.get(item.id)}
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
