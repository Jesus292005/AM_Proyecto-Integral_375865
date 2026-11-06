import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvisoSinConexion,
  EncabezadoPantalla,
  EncabezadoPartido,
  Esqueleto,
  EstadoPantalla,
  Seccion,
  Texto,
  type EstadoEncabezado,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { formatearDia, formatearHora } from '../formato/fechas';
import { obtenerMisPuntosDePartido } from '../puntos/datos';
import { PuntosDelPartido } from '../puntos/PuntosDelPartido';
import { useTema } from '../tema';
import { obtenerMiPrediccion, obtenerPartido, type PartidoDetalle } from './datos';
import { contadorCierre, prediccionAbierta, type Prediccion } from './eleccion';
import { clavesPrediccion, FormularioPrediccion } from './FormularioPrediccion';
import { useAhora } from './useAhora';

const mensajes = {
  // Mismos textos que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  error: 'No pudimos cargar el partido. Inténtalo de nuevo.',
  noExiste: 'Este partido no existe.',
  cerradoAlGuardar: 'El partido ya cerró; tu cambio no se guardó.',
  cerradoEnPantalla: 'Se cerraron las predicciones.',
  noPredijo: 'No predijiste este partido.',
} as const;

const textoResultado = (partido: PartidoDetalle, prediccion: Prediccion) => {
  if (prediccion.resultado === 'LOCAL') return `Gana ${partido.local.nombre_corto}`;
  if (prediccion.resultado === 'VISITANTE') return `Gana ${partido.visitante.nombre_corto}`;
  return 'Empate';
};

// D48.
const textoRango = { G0_1: '0–1', G2: '2', G3: '3', G4_MAS: '4 o más' } as const;

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View>
      <Texto variante="meta" color="textoTenue">
        {etiqueta}
      </Texto>
      <Texto variante="cuerpoFuerte">{valor}</Texto>
    </View>
  );
}

/** Mi predicción en solo lectura, después del cierre (Flujo 6). */
function PrediccionCerrada({
  partido,
  guardada,
}: {
  partido: PartidoDetalle;
  guardada: Prediccion | null;
}) {
  const { espacio } = useTema();

  return (
    <View style={{ gap: espacio.xl }}>
      <Seccion etiqueta="Tu predicción">
        {guardada === null ? (
          <Texto variante="cuerpo">{mensajes.noPredijo}</Texto>
        ) : (
          <View style={{ gap: espacio.s }}>
            {guardada.marcador_local !== null && guardada.marcador_visitante !== null && (
              <Dato
                etiqueta="Marcador exacto"
                valor={`${partido.local.nombre_corto} ${guardada.marcador_local} - ${guardada.marcador_visitante} ${partido.visitante.nombre_corto}`}
              />
            )}
            {guardada.resultado !== null && (
              <Dato etiqueta="Resultado" valor={textoResultado(partido, guardada)} />
            )}
            {guardada.rango_goles !== null && (
              <Dato etiqueta="Goles en total" valor={textoRango[guardada.rango_goles]} />
            )}
          </View>
        )}
      </Seccion>
      {/* F04 Flujo 3: en solo lectura; sin justificación no hay sección. */}
      {guardada?.justificacion != null && (
        <Seccion etiqueta="Tu análisis">
          <Texto variante="cuerpo">{guardada.justificacion}</Texto>
        </Seccion>
      )}
    </View>
  );
}

function Aviso({ mensaje }: { mensaje: string }) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colores.superficie2,
        borderRadius: medidas.radio,
        paddingVertical: espacio.xs,
        paddingHorizontal: espacio.s,
      }}
    >
      <Texto variante="meta" color="texto2">
        {mensaje}
      </Texto>
    </View>
  );
}

function EsqueletoPartido() {
  const { espacio } = useTema();

  return (
    <View testID="partido-cargando" style={{ gap: espacio.m }}>
      <Esqueleto variante="titulo1" ancho="70%" />
      <Esqueleto variante="pestana" ancho="15%" />
      <Esqueleto variante="titulo1" ancho="60%" />
      <Esqueleto variante="titulo2" ancho="40%" />
      <Esqueleto variante="pestana" ancho="80%" />
      <Esqueleto variante="cuerpoFuerte" ancho="100%" />
      <Esqueleto variante="cuerpoFuerte" ancho="100%" />
    </View>
  );
}

function estadoEncabezado(
  partido: PartidoDetalle,
  abierto: boolean,
  ahora: Date,
): EstadoEncabezado {
  const { goles_local, goles_visitante } = partido;
  if (partido.estado === 'TERMINADO' && goles_local !== null && goles_visitante !== null) {
    return { tipo: 'terminado', golesLocal: goles_local, golesVisitante: goles_visitante };
  }
  if (!abierto) return { tipo: 'cerrado' };
  const cierre = new Date(partido.cierre_predicciones);
  return { tipo: 'porJugar', cierre, contador: contadorCierre(cierre, ahora) };
}

/** S03: detalle del partido con el formulario de predicción (F03). */
export function PantallaPartido() {
  const { partidoId } = useLocalSearchParams<'/partido/[partidoId]'>();
  const id = Number(partidoId);
  const idValido = Number.isInteger(id) && id > 0;
  const { colores, espacio, medidas } = useTema();
  const ahora = useAhora();
  const [cerradoPorServidor, setCerradoPorServidor] = useState(false);
  const [cerroEnPantalla, setCerroEnPantalla] = useState(false);

  const partido = useQuery({
    queryKey: ['partido', id],
    queryFn: () => obtenerPartido(id),
    enabled: idValido,
  });
  const prediccion = useQuery({
    queryKey: clavesPrediccion.mia(id),
    queryFn: () => obtenerMiPrediccion(id),
    enabled: idValido,
  });

  // F10: con el partido terminado (o cancelado) y mi predicción, mis puntos con su desglose.
  const conPuntos = partido.data?.estado === 'TERMINADO' || partido.data?.estado === 'CANCELADO';
  const puntos = useQuery({
    queryKey: ['mis-puntos', 'partido', id],
    queryFn: () => obtenerMisPuntosDePartido(id),
    enabled: idValido && conPuntos && prediccion.data != null,
  });

  const abierto =
    partido.data != null && !cerradoPorServidor && prediccionAbierta(partido.data, ahora);

  // Si el cierre llega con la pantalla abierta, lo no guardado se descarta con aviso (Flujo 6).
  const estabaAbierto = useRef(false);
  useEffect(() => {
    if (estabaAbierto.current && !abierto && !cerradoPorServidor) setCerroEnPantalla(true);
    estabaAbierto.current = abierto;
  }, [abierto, cerradoPorServidor]);

  function alCerrarEnServidor() {
    setCerradoPorServidor(true);
    void partido.refetch();
    void prediccion.refetch();
  }

  const reintentar = () => {
    void partido.refetch();
    void prediccion.refetch();
  };
  const fallaInicial = [partido, prediccion].find((c) => c.isError && c.data === undefined);

  let contenido: ReactNode;
  if (!idValido || partido.data === null) {
    contenido = (
      <EstadoPantalla
        mensaje={mensajes.noExiste}
        accion={{ titulo: 'Ir a Partidos', onPress: () => router.navigate('/partidos') }}
      />
    );
  } else if (fallaInicial) {
    contenido = (
      <EstadoPantalla
        mensaje={esSinConexion(fallaInicial.error) ? mensajes.sinConexion : mensajes.error}
        accion={{ titulo: 'Reintentar', onPress: reintentar }}
      />
    );
  } else if (partido.data === undefined || prediccion.data === undefined) {
    contenido = <EsqueletoPartido />;
  } else {
    const datos = partido.data;
    const guardada = prediccion.data;
    // Error al actualizar con datos ya cargados: se siguen mostrando, con aviso (05-ui §6).
    const fallida = [partido, prediccion].find((c) => c.isRefetchError);
    let aviso: string | null = null;
    if (cerradoPorServidor) aviso = mensajes.cerradoAlGuardar;
    else if (cerroEnPantalla) aviso = mensajes.cerradoEnPantalla;

    contenido = (
      <View style={{ gap: espacio.xl }}>
        {fallida && (
          <AvisoSinConexion
            actualizadoEn={new Date(fallida.dataUpdatedAt)}
            sinConexion={esSinConexion(fallida.error)}
          />
        )}
        {datos.es_simulado && (
          // Decisión 2 (D90): todos ven los simulados, marcados.
          <Texto variante="etiqueta" color="texto2">
            Simulado
          </Texto>
        )}
        <EncabezadoPartido
          local={{ nombre: datos.local.nombre_corto, color: datos.local.color_primario }}
          visitante={{
            nombre: datos.visitante.nombre_corto,
            color: datos.visitante.color_primario,
          }}
          estado={estadoEncabezado(datos, abierto, ahora)}
        />
        {aviso !== null && <Aviso mensaje={aviso} />}
        {abierto ? (
          <FormularioPrediccion
            partido={datos}
            guardada={guardada}
            onCerrado={alCerrarEnServidor}
          />
        ) : (
          <PrediccionCerrada partido={datos} guardada={guardada} />
        )}
        {!abierto && guardada !== null && conPuntos && puntos.data !== null && (
          <PuntosDelPartido
            {...(puntos.data !== undefined
              ? { estado: 'listo', puntos: puntos.data, prediccion: guardada }
              : puntos.isError
                ? { estado: 'error', onReintentar: () => void puntos.refetch() }
                : { estado: 'cargando' })}
          />
        )}
      </View>
    );
  }

  const inicio = partido.data ? new Date(partido.data.inicio) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.xl,
          gap: espacio.l,
        }}
      >
        <EncabezadoPantalla
          onVolver={router.canGoBack() ? () => router.back() : undefined}
          meta={inicio ? `${formatearDia(inicio)} · ${formatearHora(inicio)}` : undefined}
        />
        {contenido}
      </ScrollView>
    </SafeAreaView>
  );
}
