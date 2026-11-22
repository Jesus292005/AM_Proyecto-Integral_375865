import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Boton, Esqueleto, EstadoPantalla, Seccion, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { elegirJornada } from '../partidos/agruparPorDia';
import { obtenerPartidosDeJornada, obtenerTorneoActual } from '../partidos/datos';
import { useAhora } from '../partido/useAhora';
import { SelectorJornada } from '../partidos/SelectorJornada';
import { useTema } from '../tema';
import { obtenerFiguraDeJornada, obtenerMuro, obtenerRanking } from './datos';
import { mensajesGrupo } from './errores';
import { MuroJornada } from './MuroJornada';
import { RankingGrupo } from './RankingGrupo';
import { TarjetaFigura } from './TarjetaFigura';

function EsqueletoTarjetas() {
  const { espacio } = useTema();
  return (
    <View testID="jornada-cargando" style={{ gap: espacio.s }}>
      <Esqueleto variante="cuerpoFuerte" ancho="60%" />
      <Esqueleto variante="cuerpo" ancho="90%" />
      <Esqueleto variante="cuerpo" ancho="80%" />
    </View>
  );
}

/** Error dentro de una sección: no rompe las demás (F26 R9). */
function ErrorSeccion({ error, mensaje, reintentar }: { error: Error; mensaje: string; reintentar: () => void }) {
  const { espacio } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      <Texto variante="meta" color="fallo">
        {esSinConexion(error) ? mensajesGrupo.sinConexion : mensaje}
      </Texto>
      <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} />
    </View>
  );
}

/**
 * Pestaña Jornada de S08 (F26 R9): selector de jornada (F08 R9) y, en secciones independientes, la
 * Figura de la jornada (R10 v1.1, D114), el ranking de la jornada (F08, decisión 4) y el muro (R11–R14).
 */
export function PestanaJornada({ grupoId, jornadaRuta }: { grupoId: number; jornadaRuta: string | undefined }) {
  const { espacio } = useTema();
  const ahora = useAhora();

  // Las jornadas del torneo actual y la elegida (D86): la misma consulta y caché de S02.
  const torneo = useQuery({ queryKey: ['torneo-actual'], queryFn: obtenerTorneoActual });
  const jornadas = torneo.data?.jornadas ?? [];
  const elegida = elegirJornada(jornadas, jornadaRuta, torneo.data?.ordenActual ?? null);
  const jornadaId = elegida?.id ?? null;

  const partidos = useQuery({
    queryKey: ['partidos-de-jornada', jornadaId],
    queryFn: () => (elegida ? obtenerPartidosDeJornada(elegida.id) : Promise.resolve([])),
    enabled: elegida !== undefined,
  });
  const conJornada = jornadaId !== null;
  const figura = useQuery({
    queryKey: ['grupo', grupoId, 'figura', jornadaId],
    queryFn: () => obtenerFiguraDeJornada(grupoId, jornadaId ?? 0),
    enabled: conJornada,
  });
  const ranking = useQuery({
    queryKey: ['grupo', grupoId, 'ranking', 'jornada', jornadaId],
    queryFn: () => obtenerRanking(grupoId, jornadaId),
    enabled: conJornada,
  });
  const muro = useQuery({
    queryKey: ['grupo', grupoId, 'muro', jornadaId],
    queryFn: () => obtenerMuro(grupoId, jornadaId ?? 0),
    enabled: conJornada,
  });

  if (torneo.data === null) return <EstadoPantalla mensaje={mensajesGrupo.sinTorneo} />;
  if (torneo.isError) {
    return (
      <EstadoPantalla
        mensaje={esSinConexion(torneo.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorRanking}
        accion={{ titulo: 'Reintentar', onPress: () => void torneo.refetch() }}
      />
    );
  }
  if (torneo.data === undefined) return <EsqueletoTarjetas />;

  const indice = elegida ? jornadas.indexOf(elegida) : -1;
  const irAJornada = (orden: number | undefined) =>
    orden === undefined ? undefined : () => router.setParams({ jornada: String(orden) });
  const selector = elegida && (
    <SelectorJornada
      nombre={elegida.nombre}
      torneo={torneo.data.nombre}
      onAnterior={irAJornada(jornadas[indice - 1]?.orden)}
      onSiguiente={irAJornada(jornadas[indice + 1]?.orden)}
    />
  );

  // F08 Estados: un torneo sin jornadas o una jornada sin partidos lo dicen con el selector activo.
  if (elegida === undefined || partidos.data?.length === 0) {
    return (
      <View style={{ gap: espacio.m }}>
        {selector}
        <Texto variante="cuerpo">{mensajesGrupo.jornadaSinPartidos}</Texto>
      </View>
    );
  }

  const nombre = elegida.nombre;

  let contenidoFigura: ReactNode;
  if (figura.data !== undefined) {
    contenidoFigura =
      figura.data === null ? (
        <Texto variante="cuerpo">{mensajesGrupo.figuraVacia(nombre)}</Texto>
      ) : (
        <TarjetaFigura figura={figura.data} />
      );
  } else if (figura.isError) {
    contenidoFigura = (
      <ErrorSeccion error={figura.error} mensaje={mensajesGrupo.errorFigura} reintentar={() => void figura.refetch()} />
    );
  } else contenidoFigura = <EsqueletoTarjetas />;

  // Ningún partido de la jornada ha cerrado: los análisis aún no se revelan (R04).
  const nadaCerrado =
    partidos.data !== undefined &&
    partidos.data.every((p) => new Date(p.cierre_predicciones).getTime() > ahora.getTime());
  let contenidoMuro: ReactNode;
  if (muro.data !== undefined) {
    if (muro.data.length > 0) {
      contenidoMuro = <MuroJornada grupoId={grupoId} jornadaId={elegida.id} analisis={muro.data} />;
    } else {
      contenidoMuro = (
        <Texto variante="cuerpo">{nadaCerrado ? mensajesGrupo.muroAntesDelCierre : mensajesGrupo.muroVacio(nombre)}</Texto>
      );
    }
  } else if (muro.isError) {
    contenidoMuro = <ErrorSeccion error={muro.error} mensaje={mensajesGrupo.errorMuro} reintentar={() => void muro.refetch()} />;
  } else contenidoMuro = <EsqueletoTarjetas />;

  return (
    <View style={{ gap: espacio.l }}>
      {selector}
      <Seccion etiqueta={mensajesGrupo.figura}>{contenidoFigura}</Seccion>
      <Seccion etiqueta={mensajesGrupo.rankingJornada}>
        <RankingGrupo
          vista="jornada"
          ranking={{ datos: ranking.data, error: ranking.error, reintentar: () => void ranking.refetch() }}
        />
      </Seccion>
      <Seccion etiqueta={mensajesGrupo.muro}>{contenidoMuro}</Seccion>
    </View>
  );
}

