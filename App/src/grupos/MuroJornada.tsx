import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ChipReaccion, FotoUsuario, Icono, Texto, type NombreIcono } from '../componentes';
import { abrirPerfil, textoPartido } from '../inicio/TarjetaAnalisis';
import { datosDePrediccion } from '../partido/presentacion';
import { useTema } from '../tema';
import { abrirPartidoDelGrupo } from './navegacion';
import { reaccionar, TIPOS_REACCION, type AnalisisDelMuro, type PartidoDelMuro, type TipoReaccion } from './datos';
import { mensajesGrupo } from './errores';

/** Los 4 tipos fijos (F26 R13) con su ícono y su nombre para el lector de pantalla. */
export const reacciones: Record<TipoReaccion, { icono: NombreIcono; nombre: string }> = {
  BIEN_VISTO: { icono: 'pulgarArriba', nombre: 'Bien visto' },
  BUEN_ANALISIS: { icono: 'bombilla', nombre: 'Buen análisis' },
  LA_CLAVO: { icono: 'diana', nombre: 'La clavó' },
  ME_RIO: { icono: 'risa', nombre: 'Me hizo reír' },
};

/** Pone, cambia o quita la mía en la copia del muro (al instante, antes de que conteste el servidor). */
export function aplicarReaccion(
  muro: AnalisisDelMuro[],
  prediccionId: number,
  tipo: TipoReaccion | null,
): AnalisisDelMuro[] {
  return muro.map((a) => {
    if (a.prediccionId !== prediccionId) return a;
    const conteos = { ...a.reacciones };
    if (a.miReaccion !== null) conteos[a.miReaccion] = Math.max(0, conteos[a.miReaccion] - 1);
    if (tipo !== null) conteos[tipo] += 1;
    return { ...a, reacciones: conteos, miReaccion: tipo };
  });
}

function textoEncabezado(partido: PartidoDelMuro): string {
  const marcador = textoPartido(partido);
  return partido.estado === 'EN_JUEGO' ? `${marcador} · En juego` : marcador;
}

function Nota({ evaluacion }: { evaluacion: AnalisisDelMuro['evaluacion'] }) {
  if (evaluacion.estado === 'EVALUADA' && evaluacion.puntos_bono !== null) {
    return <Texto variante="titulo2">{`${evaluacion.puntos_bono}/100`}</Texto>;
  }
  return evaluacion.estado === 'ERROR' ? (
    <Texto variante="meta" color="textoTenue">
      {mensajesGrupo.sinNota}
    </Texto>
  ) : (
    <Texto variante="meta" color="pendiente">
      {mensajesGrupo.notaPendiente}
    </Texto>
  );
}

function TarjetaMuro({
  analisis,
  onReaccionar,
  fallo,
}: {
  analisis: AnalisisDelMuro;
  onReaccionar: (tipo: TipoReaccion) => void;
  fallo: boolean;
}) {
  const { colores, espacio, medidas } = useTema();
  const [comentarioAbierto, setComentarioAbierto] = useState(false);
  const { autor, evaluacion } = analisis;
  const quien = autor.es_yo ? 'Tú' : autor.nombre;
  const prediccion = datosDePrediccion(analisis.partido, analisis.prediccion)
    .map((d) => `${d.etiqueta}: ${d.valor}`)
    .join(' · ');

  return (
    <View
      testID="analisis-del-muro"
      style={{ gap: espacio.s, padding: espacio.m, borderRadius: medidas.radio, backgroundColor: colores.superficie }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver el perfil de ${quien}`}
          onPress={() => abrirPerfil(autor.usuario_id)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: medidas.areaTactil }}
        >
          <FotoUsuario url={autor.foto_url} nombre={autor.nombre} />
          <View style={{ flex: 1 }}>
            <Texto variante="cuerpoFuerte" numberOfLines={1}>
              {quien}
            </Texto>
          </View>
        </Pressable>
        <Nota evaluacion={evaluacion} />
      </View>
      {prediccion !== '' && (
        <Texto variante="meta" color="texto2">
          {prediccion}
        </Texto>
      )}
      <Texto variante="cuerpo">{analisis.justificacion}</Texto>
      {evaluacion.explicacion !== null && (
        <View style={{ gap: espacio.xxs }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Comentario de la IA"
            accessibilityState={{ expanded: comentarioAbierto }}
            onPress={() => setComentarioAbierto((abierto) => !abierto)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, minHeight: medidas.areaTactil }}
          >
            <Texto variante="etiqueta" color="textoTenue">
              Comentario de la IA
            </Texto>
            <Icono nombre={comentarioAbierto ? 'chevronArriba' : 'chevronAbajo'} color="textoTenue" />
          </Pressable>
          {comentarioAbierto && (
            <Texto variante="cuerpo" color="texto2">
              {evaluacion.explicacion}
            </Texto>
          )}
        </View>
      )}
      {analisis.esSimulada && (
        <Texto variante="meta" color="textoTenue">
          Simulado
        </Texto>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs }}>
        {TIPOS_REACCION.map((tipo) => (
          <ChipReaccion
            key={tipo}
            icono={reacciones[tipo].icono}
            etiqueta={reacciones[tipo].nombre}
            conteo={analisis.reacciones[tipo]}
            activa={analisis.miReaccion === tipo}
            onPress={() => onReaccionar(tipo)}
          />
        ))}
      </View>
      {fallo && (
        <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
          {mensajesGrupo.falloReaccion}
        </Texto>
      )}
    </View>
  );
}

interface Props {
  grupoId: number;
  jornadaId: number;
  analisis: AnalisisDelMuro[];
}

/**
 * Muro de la jornada (F26 R12, R14): tarjetas agrupadas por partido, en el orden del servidor.
 * Reaccionar cambia la copia al instante y, si el servidor falla, vuelve como estaba.
 */
export function MuroJornada({ grupoId, jornadaId, analisis }: Props) {
  const { espacio, medidas } = useTema();
  const clienteConsultas = useQueryClient();
  const clave = ['grupo', grupoId, 'muro', jornadaId];
  const [fallida, setFallida] = useState<number | null>(null);

  const reaccion = useMutation({
    mutationFn: ({ prediccionId, tipo }: { prediccionId: number; tipo: TipoReaccion | null }) =>
      reaccionar(grupoId, prediccionId, tipo),
    onMutate: async ({ prediccionId, tipo }) => {
      setFallida(null);
      await clienteConsultas.cancelQueries({ queryKey: clave });
      const antes = clienteConsultas.getQueryData<AnalisisDelMuro[]>(clave);
      if (antes) clienteConsultas.setQueryData(clave, aplicarReaccion(antes, prediccionId, tipo));
      return { antes };
    },
    onError: (_error, { prediccionId }, contexto) => {
      if (contexto?.antes) clienteConsultas.setQueryData(clave, contexto.antes);
      setFallida(prediccionId);
    },
    onSettled: () => void clienteConsultas.invalidateQueries({ queryKey: clave }),
  });

  // Agrupa por partido conservando el orden del servidor (por inicio y bono, F26 R11).
  const partidos: { partido: PartidoDelMuro; analisis: AnalisisDelMuro[] }[] = [];
  for (const a of analisis) {
    const ultimo = partidos[partidos.length - 1];
    if (ultimo?.partido.id === a.partido.id) ultimo.analisis.push(a);
    else partidos.push({ partido: a.partido, analisis: [a] });
  }

  return (
    <View style={{ gap: espacio.l }}>
      {partidos.map(({ partido, analisis: delPartido }) => (
        <View key={partido.id} style={{ gap: espacio.s }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${textoEncabezado(partido)}. Ver el partido`}
            onPress={() => abrirPartidoDelGrupo(grupoId, partido.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, minHeight: medidas.areaTactil }}
          >
            <View style={{ flex: 1 }}>
              <Texto variante="cuerpoFuerte" numberOfLines={1}>
                {textoEncabezado(partido)}
              </Texto>
            </View>
            <Icono nombre="chevronDerecha" color="textoTenue" />
          </Pressable>
          {delPartido.map((a) => (
            <TarjetaMuro
              key={a.prediccionId}
              analisis={a}
              fallo={fallida === a.prediccionId}
              onReaccionar={(tipo) =>
                reaccion.mutate({ prediccionId: a.prediccionId, tipo: a.miReaccion === tipo ? null : tipo })
              }
            />
          ))}
        </View>
      ))}
    </View>
  );
}
