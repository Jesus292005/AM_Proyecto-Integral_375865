import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Boton,
  EncabezadoPantalla,
  EscudoEquipo,
  Esqueleto,
  EstadoPantalla,
  FotoUsuario,
  Seccion,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { Carta, type ParteCarta } from './Carta';
import { DetalleCarta } from './DetalleCarta';
import { ErrorPerfilNoEncontrado, obtenerInsigniasDe, obtenerPerfilDe, type PerfilDeUsuario } from './datosUsuario';
import { renglonesDeNombre } from './nombre';
import { ContenidoRacha } from './SeccionRacha';
import { RejillaVitrina } from './SeccionVitrina';

// S13 en tercera persona (F19 R3); con mi propio id, "Así te ven en tus grupos" (R8).
const mensajes = {
  noEncontrado: 'No puedes ver este perfil: solo se ven los de tus compañeros de grupo.',
  asiTeVen: 'Así te ven en tus grupos.',
  sinEquipo: 'Sin equipo favorito',
  explicacionCarta: 'Se calcula con todas sus predicciones calificadas. Toca la media o un atributo para ver qué es.',
  simulados: 'Incluye partidos simulados',
  error: 'No pudimos cargar este perfil.',
  errorVitrina: 'No pudimos cargar su Vitrina.',
  // Mismo texto que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
} as const;

function ErrorSeccion({ error, mensaje, reintentar }: { error: Error; mensaje: string; reintentar: () => void }) {
  const { espacio } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      <Texto variante="meta" color="fallo">
        {esSinConexion(error) ? mensajes.sinConexion : mensaje}
      </Texto>
      <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} />
    </View>
  );
}

/** Encabezado, carta y racha de esa persona (F19 R2), en solo lectura. */
function PerfilLeido({ perfil }: { perfil: PerfilDeUsuario }) {
  const { espacio } = useTema();
  const [elegido, setElegido] = useState<ParteCarta | null>(null);
  const deOtro = !perfil.esYo;
  const { racha, carta } = perfil;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
        <FotoUsuario url={perfil.foto_url} nombre={perfil.nombre} tamano="fotoPerfil" />
        <View style={{ flex: 1, gap: espacio.xxs }}>
          <Texto
            variante="titulo1"
            accessibilityRole="header"
            numberOfLines={renglonesDeNombre(perfil.nombre)}
            adjustsFontSizeToFit
          >
            {perfil.nombre}
          </Texto>
          {perfil.equipo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xs }}>
              <EscudoEquipo equipo={perfil.equipo} tamano="escudoLista" />
              <Texto variante="cuerpoFuerte" color="texto2">
                {perfil.equipo.nombre_corto}
              </Texto>
            </View>
          ) : (
            <Texto variante="cuerpoFuerte" color="textoTenue">
              {mensajes.sinEquipo}
            </Texto>
          )}
          {perfil.esYo && (
            <Texto variante="meta" color="textoTenue">
              {mensajes.asiTeVen}
            </Texto>
          )}
        </View>
      </View>

      <Seccion etiqueta="Carta">
        <View style={{ gap: espacio.s }}>
          <Carta carta={carta} perfil={perfil} elegido={elegido} onElegir={setElegido} deOtro={deOtro} />
          <DetalleCarta carta={carta} parte={elegido} onCerrar={() => setElegido(null)} deOtro={deOtro} />
          <Texto variante="meta" color="textoTenue">
            {mensajes.explicacionCarta}
          </Texto>
          {carta.incluye_simulados && (
            <Texto variante="meta" color="textoTenue">
              {mensajes.simulados}
            </Texto>
          )}
        </View>
      </Seccion>

      <Seccion etiqueta="Racha">
        <ContenidoRacha racha={racha} deOtro={deOtro} />
      </Seccion>
    </>
  );
}

function VitrinaLeida({ usuarioId, deOtro }: { usuarioId: string; deOtro: boolean }) {
  const { colores, espacio, medidas } = useTema();
  const vitrina = useQuery({ queryKey: ['usuario', usuarioId, 'insignias'], queryFn: () => obtenerInsigniasDe(usuarioId) });

  let contenido: ReactNode;
  if (vitrina.data !== undefined) {
    contenido = <RejillaVitrina insignias={vitrina.data} deOtro={deOtro} />;
  } else if (vitrina.isError && !(vitrina.error instanceof ErrorPerfilNoEncontrado)) {
    contenido = <ErrorSeccion error={vitrina.error} mensaje={mensajes.errorVitrina} reintentar={() => void vitrina.refetch()} />;
  } else {
    contenido = (
      <View testID="vitrina-cargando" style={{ flexDirection: 'row', gap: espacio.l }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: medidas.medallaInsignia,
              height: medidas.medallaInsignia,
              borderRadius: medidas.medallaInsignia / 2,
              backgroundColor: colores.superficie,
            }}
          />
        ))}
      </View>
    );
  }

  return <Seccion etiqueta="Vitrina">{contenido}</Seccion>;
}

function EsqueletoPerfil() {
  const { colores, espacio, medidas } = useTema();
  return (
    <View testID="perfil-usuario-cargando" style={{ gap: espacio.l }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
        <View
          style={{
            width: medidas.fotoPerfil,
            height: medidas.fotoPerfil,
            borderRadius: medidas.fotoPerfil / 2,
            backgroundColor: colores.superficie,
          }}
        />
        <View style={{ flex: 1, gap: espacio.xs }}>
          <Esqueleto variante="titulo1" ancho="70%" />
          <Esqueleto variante="cuerpoFuerte" ancho="40%" />
        </View>
      </View>
      <View style={{ borderRadius: medidas.radioModal, padding: espacio.m, gap: espacio.m, backgroundColor: colores.superficie }}>
        <Esqueleto variante="titulo1" ancho="60%" />
        <Esqueleto variante="numero" ancho="100%" />
      </View>
    </View>
  );
}

function volver() {
  if (router.canGoBack()) router.back();
  else router.navigate('/grupos');
}

/**
 * S13, perfil de otro usuario (F19): el diseño de S09 en solo lectura, sin Ajustes ni barra
 * superior, y nunca predicciones (R4). Solo para quien comparte grupo con esa persona (R1).
 */
export function PantallaPerfilUsuario() {
  const { usuarioId } = useLocalSearchParams<'/usuario/[usuarioId]'>();
  const id = typeof usuarioId === 'string' ? usuarioId : '';
  // Los ids de usuario son UUID: otro texto no llega al servidor (F19 R1).
  const idValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);
  const clienteConsultas = useQueryClient();
  const perfil = useQuery({
    queryKey: ['usuario', id, 'perfil'],
    queryFn: () => obtenerPerfilDe(id),
    enabled: idValido,
  });

  async function recargar() {
    setRefrescando(true);
    await clienteConsultas.refetchQueries({ queryKey: ['usuario', id], type: 'active' });
    setRefrescando(false);
  }

  let contenido: ReactNode;
  if (!idValido || perfil.error instanceof ErrorPerfilNoEncontrado) {
    // Con historial, el "← Volver" del encabezado basta; sin él (enlace directo), un botón lleva a Grupos.
    contenido = (
      <EstadoPantalla
        mensaje={mensajes.noEncontrado}
        accion={router.canGoBack() ? undefined : { titulo: 'Volver', onPress: volver }}
      />
    );
  } else if (perfil.data !== undefined) {
    contenido = (
      <>
        <PerfilLeido perfil={perfil.data} />
        <VitrinaLeida usuarioId={id} deOtro={!perfil.data.esYo} />
      </>
    );
  } else if (perfil.isError) {
    contenido = <ErrorSeccion error={perfil.error} mensaje={mensajes.error} reintentar={() => void perfil.refetch()} />;
  } else {
    contenido = <EsqueletoPerfil />;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: medidas.margenPantalla, paddingBottom: espacio.xl, gap: espacio.l }}
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
        <EncabezadoPantalla onVolver={router.canGoBack() ? () => router.back() : undefined} />
        {contenido}
      </ScrollView>
    </SafeAreaView>
  );
}
