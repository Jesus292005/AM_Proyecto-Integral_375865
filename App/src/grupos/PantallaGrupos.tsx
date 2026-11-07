import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoSinConexion, Boton, Esqueleto, EstadoPantalla, TablaFila, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { obtenerMisGrupos } from './datos';
import { mensajesGrupo } from './errores';

const textoMiembros = (n: number) => (n === 1 ? '1 miembro' : `${n} miembros`);

function EsqueletoGrupos() {
  const { espacio } = useTema();

  return (
    <View testID="grupos-cargando" style={{ gap: espacio.m }}>
      <Esqueleto variante="cuerpoFuerte" ancho="70%" />
      <Esqueleto variante="cuerpoFuerte" ancho="55%" />
      <Esqueleto variante="cuerpoFuerte" ancho="65%" />
    </View>
  );
}

/** S04: mis grupos con su número de miembros y las acciones de crear y unirse (F07 R9). */
export function PantallaGrupos() {
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);
  const grupos = useQuery({ queryKey: ['mis-grupos'], queryFn: obtenerMisGrupos });

  async function recargar() {
    setRefrescando(true);
    await grupos.refetch();
    setRefrescando(false);
  }

  let contenido: ReactNode;
  if (grupos.data === undefined) {
    contenido = grupos.isError ? (
      <EstadoPantalla
        mensaje={esSinConexion(grupos.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorMisGrupos}
        accion={{ titulo: 'Reintentar', onPress: () => void grupos.refetch() }}
      />
    ) : (
      <EsqueletoGrupos />
    );
  } else if (grupos.data.length === 0) {
    contenido = (
      <View style={{ paddingVertical: espacio.xxl }}>
        <Texto variante="cuerpo" alineacion="center">
          {mensajesGrupo.sinGrupos}
        </Texto>
      </View>
    );
  } else {
    contenido = (
      <View>
        {grupos.isRefetchError && (
          <AvisoSinConexion
            actualizadoEn={new Date(grupos.dataUpdatedAt)}
            sinConexion={esSinConexion(grupos.error)}
          />
        )}
        {grupos.data.map((grupo) => (
          <TablaFila
            key={grupo.id}
            accessibilityLabel={`${grupo.nombre}, ${textoMiembros(grupo.miembros)}`}
            onPress={() =>
              router.navigate({ pathname: '/grupo/[grupoId]', params: { grupoId: String(grupo.id) } })
            }
          >
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpoFuerte" numberOfLines={1}>
                {grupo.nombre}
              </Texto>
            </View>
            <Texto variante="meta" color="textoTenue">
              {textoMiembros(grupo.miembros)}
            </Texto>
          </TablaFila>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingTop: espacio.l,
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
        <Texto variante="titulo1" accessibilityRole="header">
          Grupos
        </Texto>
        {contenido}
        <View style={{ gap: espacio.s }}>
          <Boton titulo="Crear grupo" onPress={() => router.navigate('/grupos/nuevo')} />
          <Boton
            titulo="Unirse con código"
            variante="secundario"
            onPress={() => router.navigate('/grupos/unirse')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
