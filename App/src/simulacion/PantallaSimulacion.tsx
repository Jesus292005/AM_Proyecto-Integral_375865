import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Boton,
  EncabezadoPantalla,
  Esqueleto,
  EstadoPantalla,
  Icono,
  PestanasTexto,
  Seccion,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { formatearDia } from '../formato/fechas';
import { contadorCierre } from '../partido/eleccion';
import { useAhora } from '../partido/useAhora';
import { useMiRol } from '../perfil/useMiRol';
import { useTema } from '../tema';
import {
  crearSimulado,
  iniciarSimulado,
  obtenerOrigenes,
  obtenerSimuladosEnCurso,
  obtenerSimuladosTerminados,
  terminarSimulado,
  type PartidoDeSimulacion,
} from './datos';
import { ErrorSimulacion, type CodigoSimulacion } from './errores';

const mensajes = {
  // Mismos textos que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  error: 'No pudimos cargar la simulación. Inténtalo de nuevo.',
  soloAdmin: 'Solo administradores.',
  sinEnCurso: 'No hay partidos simulados en curso.',
  sinOrigenes: 'No hay partidos terminados con datos. Fuerza P4 de algunos partidos de 2024 (D85).',
  falla: 'No se pudo completar. Inténtalo de nuevo.',
} as const;

const mensajeDeCodigo: Record<CodigoSimulacion, string> = {
  SOLO_ADMIN: mensajes.soloAdmin,
  ORIGEN_INVALIDO: 'Ese partido ya no sirve como origen; actualiza la lista.',
  ESTADO_INVALIDO: 'El partido ya cambió de estado; actualiza la lista.',
  AUN_NO_CIERRA: 'Todavía no cierra; usa Iniciar ahora.',
  SIN_TORNEO_ACTUAL: 'No hay torneo actual.',
  MINUTOS_INVALIDOS: mensajes.falla,
  NO_ES_SIMULADO: mensajes.falla,
};

function mensajeDeFalla(error: Error): string {
  if (error instanceof ErrorSimulacion) return mensajeDeCodigo[error.codigo];
  return esSinConexion(error) ? mensajes.sinConexion : mensajes.falla;
}

type Minutos = '10' | '30' | '60';

const opcionesMinutos: readonly { valor: Minutos; titulo: string }[] = [
  { valor: '10', titulo: '10 min' },
  { valor: '30', titulo: '30 min' },
  { valor: '60', titulo: '60 min' },
];

type Accion =
  | { tipo: 'crear'; origen: number; minutos: number }
  | { tipo: 'iniciar'; partido: number }
  | { tipo: 'terminar'; partido: number };

const claveDe = (accion: Accion) =>
  accion.tipo === 'crear' ? 'crear' : `${accion.tipo}-${accion.partido}`;

function ejecutar(accion: Accion): Promise<unknown> {
  if (accion.tipo === 'crear') return crearSimulado(accion.origen, accion.minutos);
  if (accion.tipo === 'iniciar') return iniciarSimulado(accion.partido);
  return terminarSimulado(accion.partido);
}

const equipos = (p: PartidoDeSimulacion) => `${p.local.nombre_corto} vs ${p.visitante.nombre_corto}`;
const conMarcador = (p: PartidoDeSimulacion) =>
  `${p.local.nombre_corto} ${p.goles_local ?? '–'} - ${p.goles_visitante ?? '–'} ${p.visitante.nombre_corto}`;

function Cargando({ testID }: { testID: string }) {
  const { espacio } = useTema();

  return (
    <View testID={testID} style={{ gap: espacio.s }}>
      <Esqueleto variante="cuerpoFuerte" ancho="70%" />
      <Esqueleto variante="meta" ancho="40%" />
      <Esqueleto variante="cuerpoFuerte" ancho="60%" />
    </View>
  );
}

/** Cargando / error / vacío de una sección (05-ui §6) o su contenido. */
function EstadoSeccion<T>({
  consulta,
  testID,
  vacio,
  children,
}: {
  consulta: UseQueryResult<T[]>;
  testID: string;
  /** Sin texto, una lista vacía no muestra nada. */
  vacio?: string;
  children: (datos: T[]) => ReactNode;
}) {
  if (consulta.isPending) return <Cargando testID={testID} />;
  if (consulta.isError) {
    return (
      <EstadoPantalla
        mensaje={esSinConexion(consulta.error) ? mensajes.sinConexion : mensajes.error}
        accion={{ titulo: 'Reintentar', onPress: () => void consulta.refetch() }}
      />
    );
  }
  if (consulta.data.length === 0) {
    return vacio === undefined ? null : <Texto variante="cuerpo">{vacio}</Texto>;
  }
  return children(consulta.data);
}

function MensajeFalla({ mensaje }: { mensaje: string | undefined }) {
  if (mensaje === undefined) return null;
  return (
    <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
      {mensaje}
    </Texto>
  );
}

function Simulacion() {
  const { colores, espacio, medidas } = useTema();
  const clienteConsultas = useQueryClient();
  const ahora = useAhora();
  const [origen, setOrigen] = useState<number | null>(null);
  const [minutos, setMinutos] = useState<Minutos>('30');
  const [falla, setFalla] = useState<{ clave: string; mensaje: string } | null>(null);

  const enCurso = useQuery({ queryKey: ['simulacion', 'en-curso'], queryFn: obtenerSimuladosEnCurso });
  const terminados = useQuery({
    queryKey: ['simulacion', 'terminados'],
    queryFn: obtenerSimuladosTerminados,
  });
  const origenes = useQuery({ queryKey: ['simulacion', 'origenes'], queryFn: obtenerOrigenes });

  const accion = useMutation({
    mutationFn: ejecutar,
    onMutate: () => setFalla(null),
    onSuccess: (_resultado, hecha) => {
      if (hecha.tipo === 'crear') setOrigen(null);
      // S02 y S03 muestran el simulado con su estado nuevo.
      for (const clave of ['simulacion', 'partidos-de-jornada', 'torneo-actual', 'partido']) {
        void clienteConsultas.invalidateQueries({ queryKey: [clave] });
      }
    },
    onError: (error, hecha) => setFalla({ clave: claveDe(hecha), mensaje: mensajeDeFalla(error) }),
  });

  const enCursoClave = accion.isPending ? claveDe(accion.variables) : null;
  const fallaDe = (clave: string) => (falla?.clave === clave ? falla.mensaje : undefined);

  function confirmarTerminar(partido: PartidoDeSimulacion) {
    Alert.alert('¿Terminar el partido?', `${equipos(partido)} toma el marcador real de su origen.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar',
        style: 'destructive',
        onPress: () => accion.mutate({ tipo: 'terminar', partido: partido.id }),
      },
    ]);
  }

  return (
    <View style={{ gap: espacio.xl }}>
      <Seccion etiqueta="En curso">
        <EstadoSeccion consulta={enCurso} testID="en-curso-cargando" vacio={mensajes.sinEnCurso}>
          {(partidos) =>
            partidos.map((partido) => {
              const abierto =
                partido.estado === 'PROGRAMADO' &&
                ahora.getTime() < Date.parse(partido.cierre_predicciones);
              const contador = contadorCierre(new Date(partido.cierre_predicciones), ahora);
              return (
                <View key={partido.id} style={{ gap: espacio.xs, paddingBottom: espacio.s }}>
                  <Texto variante="cuerpoFuerte">{equipos(partido)}</Texto>
                  <Texto variante="meta" color="textoTenue">
                    {abierto
                      ? `Por jugar · Cierra en ${contador ?? ''}`
                      : `${partido.estado === 'EN_JUEGO' ? 'En juego' : 'Por jugar'} · Predicciones cerradas`}
                  </Texto>
                  {partido.estado === 'PROGRAMADO' && (
                    <Boton
                      titulo="Iniciar ahora"
                      variante="secundario"
                      accessibilityLabel={`Iniciar ahora ${equipos(partido)}`}
                      onPress={() => accion.mutate({ tipo: 'iniciar', partido: partido.id })}
                      deshabilitado={accion.isPending && enCursoClave !== `iniciar-${partido.id}`}
                      cargando={enCursoClave === `iniciar-${partido.id}`}
                    />
                  )}
                  <MensajeFalla mensaje={fallaDe(`iniciar-${partido.id}`)} />
                  <Boton
                    titulo="Terminar"
                    variante="secundario"
                    accessibilityLabel={`Terminar ${equipos(partido)}`}
                    onPress={() => confirmarTerminar(partido)}
                    deshabilitado={accion.isPending && enCursoClave !== `terminar-${partido.id}`}
                    cargando={enCursoClave === `terminar-${partido.id}`}
                  />
                  <MensajeFalla mensaje={fallaDe(`terminar-${partido.id}`)} />
                </View>
              );
            })
          }
        </EstadoSeccion>
        <EstadoSeccion consulta={terminados} testID="terminados-cargando">
          {(partidos) => (
            <View style={{ gap: espacio.xxs }}>
              <Texto variante="etiqueta" color="textoTenue">
                Terminados
              </Texto>
              {partidos.map((partido) => (
                <Texto key={partido.id} variante="cuerpo">
                  {conMarcador(partido)}
                </Texto>
              ))}
            </View>
          )}
        </EstadoSeccion>
      </Seccion>

      <Seccion etiqueta="Nuevo">
        <EstadoSeccion consulta={origenes} testID="origenes-cargando" vacio={mensajes.sinOrigenes}>
          {(partidos) => (
            <View accessibilityRole="radiogroup" accessibilityLabel="Partido de origen">
              {partidos.map((partido) => {
                const elegido = partido.id === origen;
                const fecha = formatearDia(new Date(partido.inicio));
                return (
                  <Pressable
                    key={partido.id}
                    onPress={() => setOrigen(elegido ? null : partido.id)}
                    disabled={accion.isPending}
                    accessibilityRole="radio"
                    accessibilityLabel={`${conMarcador(partido)}, ${fecha}`}
                    accessibilityState={{ checked: elegido, disabled: accion.isPending }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: espacio.xs,
                      minHeight: medidas.areaTactil,
                      paddingHorizontal: espacio.xs,
                      borderRadius: medidas.radio,
                      borderWidth: medidas.linea,
                      borderColor: elegido ? colores.acento : 'transparent',
                      backgroundColor: elegido ? colores.superficie2 : 'transparent',
                      opacity: pressed ? medidas.opacidadPresionado : 1,
                    })}
                  >
                    {elegido && <Icono nombre="check" color="acento" />}
                    <View style={{ flex: 1 }}>
                      <Texto variante="cuerpoFuerte" numberOfLines={1}>
                        {conMarcador(partido)}
                      </Texto>
                    </View>
                    <Texto variante="meta" color="textoTenue">
                      {fecha}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          )}
        </EstadoSeccion>
        <PestanasTexto
          pestanas={opcionesMinutos}
          activa={minutos}
          onCambiar={setMinutos}
          deshabilitado={accion.isPending}
        />
        <Boton
          titulo="Crear"
          onPress={() => origen !== null && accion.mutate({ tipo: 'crear', origen, minutos: Number(minutos) })}
          deshabilitado={origen === null || (accion.isPending && enCursoClave !== 'crear')}
          cargando={enCursoClave === 'crear'}
        />
        <MensajeFalla mensaje={fallaDe('crear')} />
      </Seccion>
    </View>
  );
}

/** S10: simulación de partidos, solo para administradores (F09). */
export function PantallaSimulacion() {
  const { colores, espacio, medidas } = useTema();
  const rol = useMiRol();
  const volver = () => (router.canGoBack() ? router.back() : router.navigate('/perfil'));

  let contenido: ReactNode;
  if (rol.isPending) contenido = <Cargando testID="simulacion-cargando" />;
  else if (rol.isError) {
    contenido = (
      <EstadoPantalla
        mensaje={esSinConexion(rol.error) ? mensajes.sinConexion : mensajes.error}
        accion={{ titulo: 'Reintentar', onPress: () => void rol.refetch() }}
      />
    );
  } else if (rol.data !== 'ADMIN') {
    // Abierta por URL sin ser administrador (F09 Estados).
    contenido = <EstadoPantalla mensaje={mensajes.soloAdmin} accion={{ titulo: 'Volver', onPress: volver }} />;
  } else contenido = <Simulacion />;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.xl,
          gap: espacio.l,
        }}
      >
        <EncabezadoPantalla onVolver={router.canGoBack() ? () => router.back() : undefined} />
        <Texto variante="titulo1" accessibilityRole="header">
          Simulación
        </Texto>
        {contenido}
      </ScrollView>
    </SafeAreaView>
  );
}
