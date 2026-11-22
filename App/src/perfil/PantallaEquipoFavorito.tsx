import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import {
  EscudoEquipo,
  Esqueleto,
  EstadoPantalla,
  Icono,
  PantallaModal,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { type EquipoFavorito, guardarEquipoFavorito, type MiPerfil, obtenerEquiposTorneoActual } from './datos';
import { claveMiPerfil, useMiPerfil } from './useMiPerfil';

const mensajes = {
  explicacion: 'Se ve en tu perfil, en tu carta y arriba en la app. Puedes cambiarlo cuando quieras.',
  // Mismos textos que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  errorCargar: 'No pudimos cargar los equipos. Inténtalo de nuevo.',
  errorGuardar: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.',
} as const;

const SIN_EQUIPO = 'Sin equipo favorito';

// Cierra el modal sin agregar historial (D78); si se abrió directo (enlace), va a Perfil.
function cerrar() {
  if (router.canGoBack()) router.back();
  else router.navigate('/perfil');
}

function Fila({
  equipo,
  elegida,
  guardando,
  deshabilitada,
  onPress,
}: {
  equipo: EquipoFavorito | null;
  elegida: boolean;
  guardando: boolean;
  deshabilitada: boolean;
  onPress: () => void;
}) {
  const { colores, espacio, medidas } = useTema();
  const nombre = equipo?.nombre_corto ?? SIN_EQUIPO;

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="radio"
      accessibilityLabel={nombre}
      accessibilityState={{ checked: elegida, disabled: deshabilitada, busy: guardando }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.s,
        minHeight: medidas.areaTactil,
        paddingVertical: espacio.xs,
        paddingHorizontal: espacio.s,
        borderRadius: medidas.radio,
        borderWidth: medidas.linea,
        borderColor: elegida ? colores.acento : 'transparent',
        backgroundColor: elegida ? colores.superficie2 : undefined,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      {equipo && <EscudoEquipo equipo={equipo} tamano="escudoLista" />}
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte" color={equipo ? 'texto' : 'texto2'} numberOfLines={1}>
          {nombre}
        </Texto>
      </View>
      {guardando && <ActivityIndicator color={colores.acento} testID="equipo-guardando" />}
      {elegida && !guardando && <Icono nombre="check" color="acento" />}
    </Pressable>
  );
}

function EsqueletoEquipos() {
  const { espacio, medidas, colores } = useTema();

  return (
    <View testID="equipos-cargando" style={{ gap: espacio.s }}>
      {[0, 1, 2, 3, 4, 5].map((fila) => (
        <View key={fila} style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
          <View
            style={{
              width: medidas.escudoLista,
              height: medidas.escudoLista,
              borderRadius: medidas.escudoLista / 2,
              backgroundColor: colores.superficie,
            }}
          />
          <View style={{ flex: 1 }}>
            <Esqueleto variante="cuerpoFuerte" ancho="50%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** S12: elegir, cambiar o quitar el equipo favorito (F18 R1–R2, R5). */
export function PantallaEquipoFavorito() {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const perfil = useMiPerfil();
  const equipos = useQuery({ queryKey: ['equipos-torneo-actual'], queryFn: obtenerEquiposTorneoActual });
  const actual = perfil.data?.equipo?.id ?? null;

  const guardar = useMutation({
    mutationFn: (equipo: EquipoFavorito | null) => guardarEquipoFavorito(equipo?.id ?? null),
    onSuccess: (_resultado, equipo) => {
      clienteConsultas.setQueryData<MiPerfil>(claveMiPerfil, (antes) => antes && { ...antes, equipo });
      void clienteConsultas.invalidateQueries({ queryKey: claveMiPerfil });
      cerrar();
    },
  });

  // R2: tocar el que ya está elegido cierra sin guardar.
  function elegir(equipo: EquipoFavorito | null) {
    if ((equipo?.id ?? null) === actual) {
      cerrar();
      return;
    }
    guardar.mutate(equipo);
  }

  // El elegido sale del perfil: sin él, "Sin equipo favorito" saldría marcado por error (R2).
  const fallida = [equipos, perfil].find((consulta) => consulta.isError && consulta.data === undefined);
  let contenido;
  if (equipos.data !== undefined && perfil.data !== undefined) {
    const tocado = guardar.isPending ? (guardar.variables?.id ?? null) : undefined;
    contenido = (
      <View style={{ gap: espacio.xs }} accessibilityRole="radiogroup">
        {[...equipos.data, null].map((equipo) => {
          const id = equipo?.id ?? null;
          return (
            <Fila
              key={id ?? 'sin-equipo'}
              equipo={equipo}
              elegida={id === actual}
              guardando={tocado === id}
              deshabilitada={guardar.isPending}
              onPress={() => elegir(equipo)}
            />
          );
        })}
      </View>
    );
  } else if (fallida) {
    contenido = (
      <EstadoPantalla
        mensaje={esSinConexion(fallida.error) ? mensajes.sinConexion : mensajes.errorCargar}
        accion={{
          titulo: 'Reintentar',
          onPress: () => {
            if (equipos.isError) void equipos.refetch();
            if (perfil.isError) void perfil.refetch();
          },
        }}
      />
    );
  } else {
    contenido = <EsqueletoEquipos />;
  }

  return (
    <PantallaModal titulo="Equipo favorito">
      <Texto variante="cuerpo" color="texto2">
        {mensajes.explicacion}
      </Texto>
      {guardar.isError && (
        <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
          {mensajes.errorGuardar}
        </Texto>
      )}
      {contenido}
    </PantallaModal>
  );
}
