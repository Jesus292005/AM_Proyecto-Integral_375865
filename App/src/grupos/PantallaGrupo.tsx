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
  TablaFila,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { formatearCodigo } from './codigo';
import { obtenerGrupo, obtenerMiembros, salirDeGrupo, type GrupoDetalle, type Miembro } from './datos';
import { mensajeAlSalir, mensajesGrupo } from './errores';
import { FotoUsuario } from './FotoUsuario';

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

function FilaMiembro({ miembro }: { miembro: Miembro }) {
  const etiqueta = [miembro.nombre, miembro.es_yo ? 'tú' : null, miembro.rol === 'ADMIN' ? 'Admin' : null]
    .filter((t) => t !== null)
    .join(', ');

  return (
    <TablaFila resaltada={miembro.es_yo} accessibilityLabel={etiqueta}>
      <FotoUsuario url={miembro.foto_url} nombre={miembro.nombre} />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {miembro.nombre}
        </Texto>
      </View>
      {miembro.rol === 'ADMIN' && (
        <Texto variante="meta" color="textoTenue">
          Admin
        </Texto>
      )}
    </TablaFila>
  );
}

function Grupo({
  grupo,
  miembros,
  aviso,
}: {
  grupo: GrupoDetalle;
  miembros: { datos: Miembro[] | undefined; error: unknown; reintentar: () => void };
  aviso: string | null;
}) {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const salida = useMutation({
    mutationFn: () => salirDeGrupo(grupo.id),
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['mis-grupos'] });
      clienteConsultas.removeQueries({ queryKey: ['grupo', grupo.id] });
      // R5: dejo de ver al instante las predicciones de quienes ya no comparten grupo conmigo.
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

  let lista: ReactNode;
  if (miembros.datos !== undefined) {
    lista = miembros.datos.map((m) => <FilaMiembro key={m.usuario_id} miembro={m} />);
  } else if (miembros.error !== null) {
    lista = (
      <EstadoPantalla
        mensaje={esSinConexion(miembros.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorGrupo}
        accion={{ titulo: 'Reintentar', onPress: miembros.reintentar }}
      />
    );
  } else {
    lista = <Esqueleto variante="cuerpoFuerte" ancho="80%" />;
  }

  return (
    <View style={{ gap: espacio.xl }}>
      <View style={{ gap: espacio.xs }}>
        <Texto variante="titulo1" accessibilityRole="header">
          {grupo.nombre}
        </Texto>
        {aviso !== null && (
          <Texto variante="meta" color="texto2" accessibilityLiveRegion="polite">
            {aviso}
          </Texto>
        )}
      </View>
      <Seccion etiqueta="Miembros">
        <View>{lista}</View>
      </Seccion>
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
    </View>
  );
}

/** S08: grupo con sus miembros, el código para invitar y salir (F07 R10). F08 agrega el ranking. */
export function PantallaGrupo() {
  const { grupoId, aviso } = useLocalSearchParams<'/grupo/[grupoId]'>();
  const id = Number(grupoId);
  const idValido = Number.isInteger(id) && id > 0;
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);

  const grupo = useQuery({ queryKey: ['grupo', id], queryFn: () => obtenerGrupo(id), enabled: idValido });
  const miembros = useQuery({
    queryKey: ['grupo', id, 'miembros'],
    queryFn: () => obtenerMiembros(id),
    enabled: idValido && grupo.data != null,
  });

  async function recargar() {
    setRefrescando(true);
    await Promise.all([grupo.refetch(), miembros.refetch()]);
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
    const fallida = [grupo, miembros].find((c) => c.isRefetchError);
    contenido = (
      <View style={{ gap: espacio.l }}>
        {fallida && (
          <AvisoSinConexion
            actualizadoEn={new Date(fallida.dataUpdatedAt)}
            sinConexion={esSinConexion(fallida.error)}
          />
        )}
        <Grupo
          grupo={grupo.data}
          miembros={{ datos: miembros.data, error: miembros.error, reintentar: () => void miembros.refetch() }}
          aviso={aviso === 'ya-miembro' ? mensajesGrupo.yaEraMiembro : null}
        />
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
          meta={miembros.data ? `${miembros.data.length} de 30 miembros` : undefined}
        />
        {contenido}
      </ScrollView>
    </SafeAreaView>
  );
}
