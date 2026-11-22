import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvisoSinConexion,
  Boton,
  BotonIcono,
  Esqueleto,
  EstadoPantalla,
  HojaModal,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { obtenerMisGrupos } from './datos';
import { mensajesGrupo } from './errores';
import { TarjetaGrupo } from './TarjetaGrupo';
import { BarraSuperior } from '../perfil/BarraSuperior';

/** "Crear grupo" (S05) y "Unirse a un grupo" (S06): en la hoja del "+" y en el vacío (F26 R4). */
function AccionesGrupo({ antes }: { antes?: () => void }) {
  const { espacio } = useTema();
  const ir = (ruta: '/grupos/nuevo' | '/grupos/unirse') => {
    antes?.();
    router.navigate(ruta);
  };

  return (
    <View style={{ alignSelf: 'stretch', gap: espacio.s }}>
      <Boton titulo="Crear grupo" icono="mas" onPress={() => ir('/grupos/nuevo')} />
      <Boton titulo="Unirse a un grupo" variante="secundario" onPress={() => ir('/grupos/unirse')} />
      <Texto variante="meta" color="textoTenue" alineacion="center">
        {mensajesGrupo.unirseSubtitulo}
      </Texto>
    </View>
  );
}

function EsqueletoGrupos() {
  const { colores, espacio, medidas } = useTema();

  return (
    <View testID="grupos-cargando" style={{ gap: espacio.s }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
          <View
            style={{
              width: medidas.iconoGrupo,
              height: medidas.iconoGrupo,
              borderRadius: medidas.iconoGrupo / 2,
              backgroundColor: colores.superficie,
            }}
          />
          <View style={{ flex: 1, gap: espacio.xxs }}>
            <Esqueleto variante="cuerpoFuerte" ancho="70%" />
            <Esqueleto variante="meta" ancho="50%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** S04: mis grupos en tarjetas (F26 R3) y el "+" para crear o unirse (F26 R4). */
export function PantallaGrupos() {
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);
  const [hojaAbierta, setHojaAbierta] = useState(false);
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
      <View style={{ paddingVertical: espacio.xxl, gap: espacio.l }}>
        <Texto variante="cuerpo" alineacion="center">
          {mensajesGrupo.sinGrupos}
        </Texto>
        <AccionesGrupo />
      </View>
    );
  } else {
    contenido = (
      <View style={{ gap: espacio.s }}>
        {grupos.isRefetchError && (
          <AvisoSinConexion
            actualizadoEn={new Date(grupos.dataUpdatedAt)}
            sinConexion={esSinConexion(grupos.error)}
          />
        )}
        {grupos.data.map((grupo) => (
          <TarjetaGrupo key={grupo.id} grupo={grupo} />
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      {/* F25 R1. */}
      <BarraSuperior />
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
          <View style={{ flex: 1 }}>
            <Texto variante="titulo1" accessibilityRole="header">
              Grupos
            </Texto>
          </View>
          <BotonIcono icono="mas" etiqueta={mensajesGrupo.crearOUnirse} onPress={() => setHojaAbierta(true)} />
        </View>
        {contenido}
      </ScrollView>
      <HojaModal visible={hojaAbierta} onCerrar={() => setHojaAbierta(false)} testID="hoja-grupos">
        <Texto variante="titulo2" accessibilityRole="header">
          {mensajesGrupo.crearOUnirse}
        </Texto>
        <AccionesGrupo antes={() => setHojaAbierta(false)} />
      </HojaModal>
    </SafeAreaView>
  );
}
