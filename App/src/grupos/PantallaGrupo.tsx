import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvisoSinConexion,
  BotonIcono,
  EncabezadoPantalla,
  Esqueleto,
  EstadoPantalla,
  IconoGrupo,
  PestanasTexto,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { obtenerGrupo, obtenerRanking, type GrupoDetalle } from './datos';
import { mensajesGrupo } from './errores';
import { PestanaJornada } from './PestanaJornada';
import { PestanaMiembros } from './PestanaMiembros';
import { RankingGrupo } from './RankingGrupo';

export type Pestana = 'ranking' | 'jornada' | 'miembros';

const pestanas: readonly { valor: Pestana; titulo: string }[] = [
  { valor: 'ranking', titulo: 'Ranking' },
  { valor: 'jornada', titulo: 'Jornada' },
  { valor: 'miembros', titulo: 'Miembros' },
];

/** `pestana?` de la ruta; una ruta vieja con `vista=jornada` (F08) abre Jornada (F26 R7). */
export function pestanaDeRuta(pestana: string | undefined, vista: string | undefined): Pestana {
  if (pestana === 'ranking' || pestana === 'jornada' || pestana === 'miembros') return pestana;
  return vista === 'jornada' ? 'jornada' : 'ranking';
}

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

/** Pestaña Ranking: el del torneo de F08, sin cambios de reglas (F26 R8, decisión 4). */
function PestanaRanking({ grupoId }: { grupoId: number }) {
  const ranking = useQuery({
    queryKey: ['grupo', grupoId, 'ranking', 'torneo', null],
    queryFn: () => obtenerRanking(grupoId, null),
  });

  return (
    <RankingGrupo
      vista="torneo"
      ranking={{ datos: ranking.data, error: ranking.error, reintentar: () => void ranking.refetch() }}
    />
  );
}

/** Encabezado (F26 R7): ícono del grupo, nombre y "Editar" para el `ADMIN` (R6). */
function Encabezado({ grupo, aviso }: { grupo: GrupoDetalle; aviso: string | undefined }) {
  const { espacio } = useTema();

  return (
    <View style={{ gap: espacio.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <IconoGrupo nombre={grupo.nombre} color={grupo.color} tamano="fotoPerfil" />
        <View style={{ flex: 1 }}>
          <Texto variante="titulo1" accessibilityRole="header" numberOfLines={2}>
            {grupo.nombre}
          </Texto>
        </View>
        {grupo.rol === 'ADMIN' && (
          <BotonIcono
            icono="lapiz"
            etiqueta="Editar grupo"
            onPress={() =>
              router.navigate({ pathname: '/grupos/editar/[grupoId]', params: { grupoId: String(grupo.id) } })
            }
          />
        )}
      </View>
      {aviso === 'ya-miembro' && (
        <Texto variante="meta" color="texto2" accessibilityLiveRegion="polite">
          {mensajesGrupo.yaEraMiembro}
        </Texto>
      )}
    </View>
  );
}

/**
 * S08 (F26 R7): encabezado y pestañas Ranking / Jornada / Miembros. Cambiar de pestaña o de jornada
 * usa `setParams` (D78). Todo se vuelve a pedir al abrir, al cambiar de pestaña o de jornada y al
 * deslizar para recargar (F08 R7).
 */
export function PantallaGrupo() {
  const { grupoId, aviso, pestana: pestanaRuta, vista, jornada } = useLocalSearchParams<'/grupo/[grupoId]'>();
  const id = Number(grupoId);
  const idValido = Number.isInteger(id) && id > 0;
  const pestana = pestanaDeRuta(
    typeof pestanaRuta === 'string' ? pestanaRuta : undefined,
    typeof vista === 'string' ? vista : undefined,
  );
  const { colores, espacio, medidas } = useTema();
  const clienteConsultas = useQueryClient();
  const [refrescando, setRefrescando] = useState(false);

  const grupo = useQuery({ queryKey: ['grupo', id], queryFn: () => obtenerGrupo(id), enabled: idValido });

  async function recargar() {
    setRefrescando(true);
    await Promise.all([
      clienteConsultas.refetchQueries({ queryKey: ['grupo', id], type: 'active' }),
      clienteConsultas.refetchQueries({ queryKey: ['torneo-actual'], type: 'active' }),
      clienteConsultas.refetchQueries({ queryKey: ['partidos-de-jornada'], type: 'active' }),
    ]);
    setRefrescando(false);
  }

  let contenido: ReactNode;
  if (!idValido || grupo.data === null) {
    contenido = (
      <EstadoPantalla
        mensaje={mensajesGrupo.noMiembro}
        accion={{ titulo: 'Ir a Grupos', onPress: () => router.navigate('/grupos') }}
      />
    );
  } else if (grupo.data === undefined) {
    contenido = grupo.isError ? (
      <EstadoPantalla
        mensaje={esSinConexion(grupo.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorGrupo}
        accion={{ titulo: 'Reintentar', onPress: () => void grupo.refetch() }}
      />
    ) : (
      <EsqueletoGrupo />
    );
  } else {
    let deLaPestana: ReactNode;
    if (pestana === 'jornada') {
      deLaPestana = <PestanaJornada grupoId={id} jornadaRuta={typeof jornada === 'string' ? jornada : undefined} />;
    } else if (pestana === 'miembros') deLaPestana = <PestanaMiembros grupo={grupo.data} />;
    else deLaPestana = <PestanaRanking grupoId={id} />;

    contenido = (
      <View style={{ gap: espacio.l }}>
        {grupo.isRefetchError && (
          <AvisoSinConexion actualizadoEn={new Date(grupo.dataUpdatedAt)} sinConexion={esSinConexion(grupo.error)} />
        )}
        <Encabezado grupo={grupo.data} aviso={typeof aviso === 'string' ? aviso : undefined} />
        <PestanasTexto pestanas={pestanas} activa={pestana} onCambiar={(valor) => router.setParams({ pestana: valor })} />
        {deLaPestana}
      </View>
    );
  }

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
          meta={grupo.data ? `${grupo.data.miembros} de 30 miembros` : undefined}
        />
        {contenido}
      </ScrollView>
    </SafeAreaView>
  );
}
