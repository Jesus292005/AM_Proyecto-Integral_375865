import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvisoSinConexion,
  Boton,
  EncabezadoPantalla,
  Esqueleto,
  EstadoPantalla,
  Seccion,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { elegirJornada } from '../partidos/agruparPorDia';
import { obtenerPartidosDeJornada, obtenerTorneoActual } from '../partidos/datos';
import { useTema } from '../tema';
import { formatearCodigo } from './codigo';
import { obtenerGrupo, obtenerRanking, salirDeGrupo, type GrupoDetalle } from './datos';
import { ErrorGrupo, mensajeAlSalir, mensajesGrupo } from './errores';
import { RankingGrupo, type Vista } from './RankingGrupo';

function EsqueletoGrupo() {
  const { espacio } = useTema();

  return (
    <View testID="grupo-cargando" style={{ gap: espacio.m }}>
      <Esqueleto variante="titulo1" ancho="60%" />
      <Esqueleto variante="cuerpoFuerte" ancho="80%" />
      <Esqueleto variante="cuerpoFuerte" ancho="70%" />
      <Esqueleto variante="titulo2" ancho="40%" />
    </View>
  );
}

/** Código para invitar y salir del grupo (F07 R10). */
function InvitarYSalir({ grupo }: { grupo: GrupoDetalle }) {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const salida = useMutation({
    mutationFn: () => salirDeGrupo(grupo.id),
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['mis-grupos'] });
      clienteConsultas.removeQueries({ queryKey: ['grupo', grupo.id] });
      // F07 R5: dejo de ver al instante las predicciones de quienes ya no comparten grupo conmigo.
      clienteConsultas.removeQueries({ queryKey: ['predicciones-grupo'] });
      router.navigate('/grupos');
    },
  });

  function confirmarSalida() {
    Alert.alert(
      '¿Salir del grupo?',
      `Dejarás de ver las predicciones de ${grupo.nombre} y saldrás de su ranking.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => salida.mutate() },
      ],
    );
  }

  return (
    <>
      <Seccion etiqueta="Invitar">
        <Texto
          variante="titulo2"
          selectable
          accessibilityLabel={`Código ${formatearCodigo(grupo.codigo_invitacion).split('').join(' ')}`}
        >
          {formatearCodigo(grupo.codigo_invitacion)}
        </Texto>
        <Texto variante="meta" color="textoTenue">
          Compártelo para que se unan desde Unirse a grupo.
        </Texto>
      </Seccion>
      <View style={{ gap: espacio.xs }}>
        <Boton
          titulo="Salir del grupo"
          variante="secundario"
          onPress={confirmarSalida}
          cargando={salida.isPending}
        />
        {salida.error && (
          <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
            {mensajeAlSalir(salida.error)}
          </Texto>
        )}
      </View>
    </>
  );
}

/**
 * S08: ranking del grupo por torneo o jornada (F08), código para invitar y salir (F07). El ranking
 * se vuelve a pedir al abrir, al cambiar de vista o de jornada y al deslizar (F08 R7).
 */
export function PantallaGrupo() {
  const { grupoId, aviso, vista: vistaRuta, jornada } = useLocalSearchParams<'/grupo/[grupoId]'>();
  const id = Number(grupoId);
  const idValido = Number.isInteger(id) && id > 0;
  const vista: Vista = vistaRuta === 'jornada' ? 'jornada' : 'torneo';
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);

  const grupo = useQuery({ queryKey: ['grupo', id], queryFn: () => obtenerGrupo(id), enabled: idValido });
  const esMiembro = grupo.data != null;

  // Vista "Jornada": las jornadas del torneo actual (las mismas de S02) y la elegida (D86).
  const torneo = useQuery({
    queryKey: ['torneo-actual'],
    queryFn: obtenerTorneoActual,
    enabled: esMiembro && vista === 'jornada',
  });
  const jornadas = torneo.data?.jornadas ?? [];
  const elegida = elegirJornada(
    jornadas,
    typeof jornada === 'string' ? jornada : undefined,
    torneo.data?.ordenActual ?? null,
  );
  const jornadaId = vista === 'jornada' ? (elegida?.id ?? null) : null;

  // "Esta jornada no tiene partidos" (F08 Estados): la misma consulta y caché de S02.
  const partidos = useQuery({
    queryKey: ['partidos-de-jornada', elegida?.id],
    queryFn: () => (elegida ? obtenerPartidosDeJornada(elegida.id) : Promise.resolve([])),
    enabled: esMiembro && vista === 'jornada' && elegida !== undefined,
  });
  let vacio: string | undefined;
  if (vista === 'jornada' && torneo.data != null && (jornadas.length === 0 || partidos.data?.length === 0)) {
    vacio = mensajesGrupo.jornadaSinPartidos;
  }

  const ranking = useQuery({
    queryKey: ['grupo', id, 'ranking', vista, jornadaId],
    queryFn: () => obtenerRanking(id, jornadaId),
    enabled: esMiembro && (vista === 'torneo' || elegida !== undefined),
  });

  async function recargar() {
    setRefrescando(true);
    await Promise.all([grupo.refetch(), ranking.refetch()]);
    setRefrescando(false);
  }

  // Sin torneo actual, la vista "Jornada" no tiene jornadas: lo dice como el ranking (F08 Estados).
  let errorRanking: Error | null = ranking.error;
  if (vista === 'jornada' && torneo.data === null) errorRanking = new ErrorGrupo('SIN_TORNEO_ACTUAL');
  else if (vista === 'jornada' && torneo.error) errorRanking = torneo.error;

  const indice = elegida ? jornadas.indexOf(elegida) : -1;
  const noMiembro =
    !idValido ||
    grupo.data === null ||
    (ranking.error instanceof ErrorGrupo && ranking.error.codigo === 'NO_MIEMBRO');

  let contenido: ReactNode;
  if (noMiembro) {
    contenido = (
      <EstadoPantalla
        mensaje={mensajesGrupo.noMiembro}
        accion={{ titulo: 'Ir a Grupos', onPress: () => router.navigate('/grupos') }}
      />
    );
  } else if (grupo.data == null) {
    contenido = grupo.isError ? (
      <EstadoPantalla
        mensaje={esSinConexion(grupo.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorGrupo}
        accion={{ titulo: 'Reintentar', onPress: () => void grupo.refetch() }}
      />
    ) : (
      <EsqueletoGrupo />
    );
  } else {
    const fallida = [grupo, ranking].find((c) => c.isRefetchError);
    contenido = (
      <View style={{ gap: espacio.xl }}>
        {fallida && (
          <AvisoSinConexion
            actualizadoEn={new Date(fallida.dataUpdatedAt)}
            sinConexion={esSinConexion(fallida.error)}
          />
        )}
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo1" accessibilityRole="header">
            {grupo.data.nombre}
          </Texto>
          {aviso === 'ya-miembro' && (
            <Texto variante="meta" color="texto2" accessibilityLiveRegion="polite">
              {mensajesGrupo.yaEraMiembro}
            </Texto>
          )}
        </View>
        <RankingGrupo
          vista={vista}
          jornada={
            elegida && torneo.data
              ? {
                  nombre: elegida.nombre,
                  torneo: torneo.data.nombre,
                  anterior: jornadas[indice - 1]?.orden,
                  siguiente: jornadas[indice + 1]?.orden,
                }
              : undefined
          }
          vacio={vacio}
          ranking={{
            datos: ranking.data,
            error: errorRanking,
            reintentar: () => void (vista === 'jornada' && torneo.isError ? torneo.refetch() : ranking.refetch()),
          }}
        />
        <InvitarYSalir grupo={grupo.data} />
      </View>
    );
  }

  const miembros = ranking.data?.filas.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.xl,
          gap: espacio.l,
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
      >
        <EncabezadoPantalla
          onVolver={router.canGoBack() ? () => router.back() : undefined}
          meta={miembros !== undefined && !noMiembro ? `${miembros} de 30 miembros` : undefined}
        />
        {contenido}
      </ScrollView>
    </SafeAreaView>
  );
}
