// S09 Perfil (F28 R1–R2): encabezado con foto, nombre y equipo; secciones; y Ajustes. Desde M6 ya
// no aplica D103 (la pantalla de la demo): tiene acceso a Equipo favorito (S12) y a Nombre (S14).
import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Boton,
  EscudoEquipo,
  Esqueleto,
  FotoUsuario,
  Icono,
  Seccion,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { useTema } from '../tema';
import { AjusteRecordatorios } from './AjusteRecordatorios';
import { SeccionCarta } from './SeccionCarta';
import { SeccionRacha } from './SeccionRacha';
import { useMiPerfil } from './useMiPerfil';

const mensajes = {
  eligeEquipo: 'Elige tu equipo',
  sinEquipo: 'Sin equipo',
  // Mismo texto que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  error: 'No pudimos cargar tu perfil.',
} as const;

/** Fila de Ajustes que abre otra pantalla: etiqueta, valor actual y flecha. */
function FilaAjuste({ etiqueta, valor, destino }: { etiqueta: string; valor?: string; destino: Href }) {
  const { colores, espacio, medidas } = useTema();

  return (
    <Pressable
      onPress={() => router.navigate(destino)}
      accessibilityRole="button"
      accessibilityLabel={valor ? `${etiqueta}: ${valor}` : etiqueta}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.s,
        minHeight: medidas.areaTactil,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.lineaSuave,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte">{etiqueta}</Texto>
      </View>
      {valor !== undefined && (
        <Texto variante="meta" color="textoTenue" numberOfLines={1}>
          {valor}
        </Texto>
      )}
      <Icono nombre="chevronDerecha" color="textoTenue" />
    </Pressable>
  );
}

/** R1: foto, nombre y equipo favorito (o la invitación a elegirlo). */
function EncabezadoPerfil() {
  const { espacio, medidas, colores } = useTema();
  const perfil = useMiPerfil();

  if (perfil.data !== undefined) {
    const { nombre, foto_url, equipo } = perfil.data;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
        <FotoUsuario url={foto_url} nombre={nombre} tamano="fotoPerfil" />
        <View style={{ flex: 1, gap: espacio.xxs }}>
          <Texto variante="titulo1" numberOfLines={2} adjustsFontSizeToFit>
            {nombre}
          </Texto>
          {equipo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xs }}>
              <EscudoEquipo equipo={equipo} tamano="escudoLista" />
              <Texto variante="cuerpoFuerte" color="texto2">
                {equipo.nombre_corto}
              </Texto>
            </View>
          ) : (
            <Pressable
              onPress={() => router.navigate('/equipo')}
              accessibilityRole="link"
              style={{ minHeight: medidas.areaTactil, justifyContent: 'center', alignSelf: 'flex-start' }}
            >
              <Texto variante="cuerpoFuerte" color="acento">
                {mensajes.eligeEquipo}
              </Texto>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (perfil.isError) {
    return (
      <View style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(perfil.error) ? mensajes.sinConexion : mensajes.error}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void perfil.refetch()} />
      </View>
    );
  }

  return (
    <View testID="perfil-cargando" style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
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
  );
}

export function PantallaPerfil() {
  const { colores, espacio, medidas } = useTema();
  const perfil = useMiPerfil();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingTop: espacio.l,
          paddingBottom: espacio.xl,
          gap: espacio.l,
        }}
      >
        <Texto variante="etiqueta" color="textoTenue" accessibilityRole="header">
          Perfil
        </Texto>
        <EncabezadoPerfil />
        <SeccionCarta />
        <SeccionRacha />
        <Seccion etiqueta="Ajustes">
          <View>
            <FilaAjuste
              etiqueta="Equipo favorito"
              valor={perfil.data ? (perfil.data.equipo?.nombre_corto ?? mensajes.sinEquipo) : undefined}
              destino="/equipo"
            />
            <FilaAjuste etiqueta="Nombre" valor={perfil.data?.nombre} destino="/nombre" />
          </View>
          <AjusteRecordatorios />
          {/* Solo administrador (F09 R1, D36); el servidor verifica el rol en cada operación. */}
          {perfil.data?.rol === 'ADMIN' && (
            <Boton
              titulo="Simulación"
              variante="secundario"
              onPress={() => router.navigate('/admin/simulacion')}
            />
          )}
          <BotonCerrarSesion />
        </Seccion>
      </ScrollView>
    </SafeAreaView>
  );
}
