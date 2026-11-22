import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { FotoUsuario, Icono, Texto } from '../componentes';
import { abrirPerfil, textoPartido } from '../inicio/TarjetaAnalisis';
import { useTema } from '../tema';
import type { FiguraDeJornada } from './datos';
import { mensajesGrupo } from './errores';

/**
 * Figura de la jornada (F26 R10 v1.1, D114): el 1.º del ranking de la jornada con sus puntos
 * (base + bono) y, si tiene, su mejor análisis con la nota y el comentario de la IA. Tocar el
 * nombre abre S13; tocar el análisis, S03 del partido.
 */
export function TarjetaFigura({ figura }: { figura: FiguraDeJornada }) {
  const { colores, espacio, medidas } = useTema();
  const quien = figura.es_yo ? 'Tú' : figura.nombre;
  const { analisis } = figura;
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
        <View accessible accessibilityLabel={`${figura.puntos_total} puntos en la jornada: base ${figura.puntos_base} y bono ${figura.puntos_bono}`} style={{ alignItems: 'flex-end' }}>
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
      {analisis !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[
            `Su mejor análisis: ${analisis.bono} de 100`,
            textoPartido(analisis),
            analisis.justificacion,
            `Comentario de la IA: ${analisis.explicacion}`,
            'Ver el partido',
          ].join('. ')}
          onPress={() =>
            router.navigate({ pathname: '/partido/[partidoId]', params: { partidoId: String(analisis.partido_id) } })
          }
          style={({ pressed }) => ({ gap: espacio.xs, opacity: pressed ? medidas.opacidadPresionado : 1 })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs }}>
            <View style={{ flex: 1 }}>
              <Texto variante="etiqueta" color="textoTenue" numberOfLines={1}>
                {`Su mejor análisis · ${textoPartido(analisis)}`}
              </Texto>
            </View>
            <Texto variante="cuerpoFuerte">{`${analisis.bono}/100`}</Texto>
            <Icono nombre="chevronDerecha" color="textoTenue" />
          </View>
          <Texto variante="cuerpo">{analisis.justificacion}</Texto>
          <Texto variante="meta" color="texto2">
            {`Comentario de la IA: ${analisis.explicacion}`}
          </Texto>
        </Pressable>
      )}
    </View>
  );
}
