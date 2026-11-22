import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { FotoUsuario, Icono, IndicadorEstado, Texto } from '../componentes';
import { abrirPerfil, textoPartido } from '../inicio/TarjetaAnalisis';
import { datosDePrediccion } from '../partido/presentacion';
import { useTema } from '../tema';
import type { FiguraDeJornada, PartidoDeFigura } from './datos';
import { mensajesGrupo } from './errores';
import { abrirPartidoDelGrupo } from './navegacion';

type Parte = { etiqueta: string; puntos: number };

/**
 * Las partes que predijo con sus puntos, como el desglose de F10 R4: con marcador, el exacto o,
 * si falló, el marcador más lo deducido (resultado y goles); sin marcador, lo que eligió.
 */
export function partesDe(p: PartidoDeFigura): Parte[] | null {
  if (p.puntos_base === null) return null;
  const resultado = p.puntos_resultado ?? 0;
  const goles = p.puntos_rango_goles ?? 0;
  const marcador = p.puntos_marcador ?? 0;
  if (p.marcador_local !== null) {
    if (marcador > 0) return [{ etiqueta: 'Marcador exacto', puntos: marcador }];
    return [
      { etiqueta: 'Marcador exacto', puntos: 0 },
      { etiqueta: 'Resultado', puntos: resultado },
      { etiqueta: 'Goles en total', puntos: goles },
    ];
  }
  const partes: Parte[] = [];
  if (p.resultado !== null) partes.push({ etiqueta: 'Resultado', puntos: resultado });
  if (p.rango_goles !== null) partes.push({ etiqueta: 'Goles en total', puntos: goles });
  return partes;
}

function textoAnalisis(p: PartidoDeFigura): string | null {
  if (p.justificacion === null) return null;
  if (p.estado_evaluacion === 'EVALUADA' && p.bono !== null) return `Análisis ${p.bono}/100`;
  return p.estado_evaluacion === 'ERROR' ? `Análisis: ${mensajesGrupo.sinNota.toLowerCase()}` : 'Análisis: nota pendiente';
}

/** Un partido de la figura: lo que acertó en grande y, aparte, su análisis (F26 R10 v1.2). */
function FilaPartido({ grupoId, partido }: { grupoId: number; partido: PartidoDeFigura }) {
  const { colores, espacio, medidas } = useTema();
  const [analisisAbierto, setAnalisisAbierto] = useState(false);
  const partes = partesDe(partido);
  const prediccion = datosDePrediccion(partido, partido)
    .map((d) => `${d.etiqueta}: ${d.valor}`)
    .join(' · ');
  const analisis = textoAnalisis(partido);

  return (
    <View
      testID="partido-de-la-figura"
      style={{ gap: espacio.xs, paddingTop: espacio.s, borderTopWidth: medidas.linea, borderTopColor: colores.lineaSuave }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          textoPartido(partido),
          prediccion !== '' && `Predijo: ${prediccion}`,
          partido.puntos_base === null ? 'Por calificar' : `${partido.puntos_base} puntos`,
          'Ver el partido',
        ]
          .filter(Boolean)
          .join('. ')}
        onPress={() => abrirPartidoDelGrupo(grupoId, partido.partido_id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, minHeight: medidas.areaTactil }}
      >
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoFuerte" numberOfLines={1}>
            {textoPartido(partido)}
          </Texto>
          {prediccion !== '' && (
            <Texto variante="meta" color="textoTenue">
              {`Predijo: ${prediccion}`}
            </Texto>
          )}
        </View>
        <Texto variante="numero">{partido.puntos_base === null ? '—' : String(partido.puntos_base)}</Texto>
        <Icono nombre="chevronDerecha" color="textoTenue" />
      </Pressable>

      {partes === null ? (
        <IndicadorEstado estado="pendiente" texto="Por calificar" />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
          {partes.map((parte) => (
            <View
              key={parte.etiqueta}
              accessible
              // El mismo patrón que el desglose de S03 (F10 R4).
              accessibilityLabel={`${parte.etiqueta}: ${parte.puntos > 0 ? 'acertada' : 'fallada'}, ${parte.puntos} puntos`}
            >
              <IndicadorEstado
                estado={parte.puntos > 0 ? 'acertada' : 'fallada'}
                texto={parte.puntos > 0 ? `${parte.etiqueta} +${parte.puntos}` : parte.etiqueta}
              />
            </View>
          ))}
        </View>
      )}

      {analisis !== null && (
        <View style={{ gap: espacio.xxs }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${analisis}. Ver su análisis`}
            accessibilityState={{ expanded: analisisAbierto }}
            onPress={() => setAnalisisAbierto((abierto) => !abierto)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, minHeight: medidas.areaTactil }}
          >
            <Texto variante="meta" color="texto2">
              {analisis}
            </Texto>
            <Icono nombre={analisisAbierto ? 'chevronArriba' : 'chevronAbajo'} color="textoTenue" />
          </Pressable>
          {analisisAbierto && (
            <>
              <Texto variante="cuerpo">{partido.justificacion}</Texto>
              {partido.explicacion !== null && (
                <Texto variante="meta" color="texto2">
                  {`Comentario de la IA: ${partido.explicacion}`}
                </Texto>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Figura de la jornada (F26 R10 v1.2, D114, D115): el 1.º del ranking de la jornada con sus puntos
 * (base + bono) y, partido por partido, lo que acertó; su análisis va aparte, desplegable. Tocar el
 * nombre abre S13; tocar un partido, S03 dentro de la pestaña Grupos (D76).
 */
export function TarjetaFigura({ grupoId, figura }: { grupoId: number; figura: FiguraDeJornada }) {
  const { colores, espacio, medidas } = useTema();
  const quien = figura.es_yo ? 'Tú' : figura.nombre;
  const notas = [
    figura.lideres > 1 && mensajesGrupo.empateFigura(figura.lideres - 1),
    figura.en_curso && 'Hasta ahora',
    figura.incluye_simulados && 'Simulado',
  ].filter(Boolean);

  return (
    <View
      testID="figura-de-la-jornada"
      style={{ gap: espacio.s, padding: espacio.m, borderRadius: medidas.radio, backgroundColor: colores.superficie }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver el perfil de ${quien}`}
          onPress={() => abrirPerfil(figura.usuario_id)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: medidas.areaTactil }}
        >
          <FotoUsuario url={figura.foto_url} nombre={figura.nombre} />
          <View style={{ flex: 1 }}>
            <Texto variante="cuerpoFuerte" numberOfLines={1}>
              {quien}
            </Texto>
            <Texto variante="meta" color="textoTenue" numberOfLines={1}>
              {`base ${figura.puntos_base} + bono ${figura.puntos_bono}`}
            </Texto>
          </View>
        </Pressable>
        <View
          accessible
          accessibilityLabel={`${figura.puntos_total} puntos en la jornada: base ${figura.puntos_base} y bono ${figura.puntos_bono}`}
          style={{ alignItems: 'flex-end' }}
        >
          <Texto variante="titulo2">{String(figura.puntos_total)}</Texto>
          <Texto variante="meta" color="textoTenue">
            puntos
          </Texto>
        </View>
      </View>
      {notas.length > 0 && (
        <Texto variante="meta" color="textoTenue">
          {notas.join(' · ')}
        </Texto>
      )}
      {figura.partidos.map((partido) => (
        <FilaPartido key={partido.partido_id} grupoId={grupoId} partido={partido} />
      ))}
    </View>
  );
}
