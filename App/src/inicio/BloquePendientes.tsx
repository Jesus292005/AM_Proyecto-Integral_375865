import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Boton, Esqueleto, Texto } from '../componentes';
import { formatearDia, formatearHora } from '../formato/fechas';
import { contadorCierre } from '../partido/eleccion';
import { useAhora } from '../partido/useAhora';
import { FilaPartido } from '../partidos/FilaPartido';
import { useTema } from '../tema';
import { BloqueInicio, type Consulta } from './BloqueInicio';
import type { Pendiente } from './datos';

/** Cuántos pendientes se ven en Inicio (R5); el resto, en S02. */
export const PENDIENTES_VISIBLES = 3;

export const mensajesPendientes = {
  vacio: 'Ya predijiste todo lo que está abierto.',
} as const;

const textoCuantos = (n: number) => (n === 1 ? '1 sin predecir' : `${n} sin predecir`);

function abrirPartido(id: number) {
  router.navigate({ pathname: '/partido/[partidoId]', params: { partidoId: String(id) } });
}

/** "El próximo cierra en hh:mm:ss" con menos de 24 h; con más, el día y la hora (F03 R8). */
function ProximoCierre({ cierre, ahora }: { cierre: Date; ahora: Date }) {
  const { espacio } = useTema();
  const contador = contadorCierre(cierre, ahora);

  if (contador === null) {
    return (
      <Texto variante="meta" color="textoTenue">
        {`El próximo cierra el ${formatearDia(cierre)} · ${formatearHora(cierre)}`}
      </Texto>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={`El próximo cierra en ${contador}`}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: espacio.xs }}
    >
      <Texto variante="meta" color="textoTenue">
        El próximo cierra en
      </Texto>
      <Texto variante="titulo2">{contador}</Texto>
    </View>
  );
}

function Contenido({ pendientes, refetch }: { pendientes: Pendiente[]; refetch: () => unknown }) {
  const { espacio } = useTema();
  const ahora = useAhora();
  const primero = pendientes[0];
  const cierre = primero === undefined ? null : new Date(primero.cierre_predicciones);
  const vencido = cierre !== null && ahora.getTime() >= cierre.getTime();

  // R5: cuando el contador llega a 0, el bloque se vuelve a pedir (decide el servidor, F03 R1).
  useEffect(() => {
    if (vencido) void refetch();
  }, [vencido, refetch]);

  if (primero === undefined || cierre === null) {
    return (
      <View style={{ gap: espacio.s }}>
        <Texto variante="cuerpo">{mensajesPendientes.vacio}</Texto>
        <Boton titulo="Ver partidos" variante="secundario" onPress={() => router.navigate('/partidos')} />
      </View>
    );
  }

  const visibles = pendientes.slice(0, PENDIENTES_VISIBLES);
  const siguiente = pendientes[PENDIENTES_VISIBLES];

  return (
    <View style={{ gap: espacio.s }}>
      <View style={{ gap: espacio.xxs }}>
        <Texto variante="cuerpoFuerte">{textoCuantos(pendientes.length)}</Texto>
        <ProximoCierre cierre={cierre} ahora={ahora} />
      </View>
      <View>
        {visibles.map((p) => (
          <View key={p.id} style={{ paddingTop: espacio.xs }}>
            <Texto variante="etiqueta" color="textoTenue">
              {`${p.jornada.nombre} · ${formatearDia(new Date(p.inicio))}`}
            </Texto>
            <FilaPartido
              partido={{
                id: p.id,
                inicio: p.inicio,
                cierre_predicciones: p.cierre_predicciones,
                estado: p.estado,
                goles_local: null,
                goles_visitante: null,
                local: p.local,
                visitante: p.visitante,
                es_simulado: p.es_simulado,
                predicho: false,
              }}
              onPress={() => abrirPartido(p.id)}
            />
          </View>
        ))}
      </View>
      {siguiente !== undefined && (
        <Boton
          titulo={`Ver los ${pendientes.length}`}
          variante="secundario"
          onPress={() =>
            router.navigate({ pathname: '/partidos', params: { jornada: String(siguiente.jornada.orden) } })
          }
        />
      )}
    </View>
  );
}

function EsqueletoPendientes() {
  const { espacio } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      <Esqueleto variante="cuerpoFuerte" ancho="40%" />
      <Esqueleto variante="cuerpoFuerte" ancho="90%" />
      <Esqueleto variante="cuerpoFuerte" ancho="90%" />
      <Esqueleto variante="cuerpoFuerte" ancho="90%" />
    </View>
  );
}

/** Bloque 1 · Pendientes de predecir (F17 R4–R5). */
export function BloquePendientes({ consulta, sinTorneo }: { consulta: Consulta<Pendiente[]>; sinTorneo: boolean }) {
  return (
    <BloqueInicio
      etiqueta="Pendientes de predecir"
      id="bloque-pendientes"
      consulta={consulta}
      sinTorneo={sinTorneo}
      esqueleto={<EsqueletoPendientes />}
    >
      {(pendientes) => <Contenido pendientes={pendientes} refetch={consulta.refetch} />}
    </BloqueInicio>
  );
}
