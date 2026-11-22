import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { FotoUsuario, Texto } from '../componentes';
import { useTema } from '../tema';
import type { MejorAnalisis } from './datos';

const HASTA_AHORA = 'Hasta ahora';

export function textoPartido(
  a: Pick<MejorAnalisis, 'goles_local' | 'goles_visitante' | 'local' | 'visitante'>,
): string {
  return a.goles_local === null || a.goles_visitante === null
    ? `${a.local.nombre_corto} vs ${a.visitante.nombre_corto}`
    : `${a.local.nombre_corto} ${a.goles_local} - ${a.goles_visitante} ${a.visitante.nombre_corto}`;
}

/** S13 dentro de la pestaña desde la que se llegó (F19 R8, D76). */
export function abrirPerfil(usuarioId: string) {
  router.navigate({ pathname: '/usuario/[usuarioId]', params: { usuarioId } });
}

interface Props {
  analisis: MejorAnalisis;
  /** Inicio (F17 R11): "en {grupo}". En S08 (F26 R10) el grupo ya se sabe. */
  conGrupo?: boolean;
  /** S08: tocar el nombre abre S13 (F26 R10, F19 R8); en Inicio no. */
  conPerfil?: boolean;
}

/**
 * Tarjeta del mejor análisis (F17 R11) y del "Analista de la jornada" (F26 R10): foto, nombre,
 * nota, partido, justificación y comentario de la IA. Tocarla abre S03 del partido.
 */
export function TarjetaAnalisis({ analisis, conGrupo = false, conPerfil = false }: Props) {
  const { colores, espacio, medidas } = useTema();
  const quien = analisis.es_yo ? 'Tú' : analisis.nombre;
  const abrirPartido = () =>
    router.navigate({ pathname: '/partido/[partidoId]', params: { partidoId: String(analisis.partido_id) } });
  const verPerfil = () => abrirPerfil(analisis.usuario_id);

  return (
    <Pressable
      onPress={abrirPartido}
      accessibilityRole="button"
      accessibilityLabel={[
        conGrupo
          ? `Mejor análisis: ${quien} en ${analisis.grupo_nombre}, ${analisis.puntos_bono} de 100`
          : `Analista de la jornada: ${quien}, ${analisis.puntos_bono} de 100`,
        textoPartido(analisis),
        analisis.justificacion,
        `Comentario de la IA: ${analisis.explicacion}`,
        analisis.en_curso && HASTA_AHORA,
        analisis.es_simulada && 'Simulado',
        'Ver el partido',
      ]
        .filter(Boolean)
        .join('. ')}
      // Con lector de pantalla, el perfil es una acción de la tarjeta (el nombre no se enfoca solo).
      accessibilityActions={conPerfil ? [{ name: 'perfil', label: `Ver el perfil de ${quien}` }] : undefined}
      onAccessibilityAction={(evento) => {
        if (evento.nativeEvent.actionName === 'perfil') verPerfil();
      }}
      style={({ pressed }) => ({
        gap: espacio.s,
        padding: espacio.m,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <Pressable
          testID="analisis-autor"
          disabled={!conPerfil}
          onPress={verPerfil}
          accessible={false}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: medidas.areaTactil }}
        >
          <FotoUsuario url={analisis.foto_url} nombre={analisis.nombre} />
          <View style={{ flex: 1 }}>
            <Texto variante="cuerpoFuerte" numberOfLines={1}>
              {quien}
            </Texto>
            {conGrupo && (
              <Texto variante="meta" color="textoTenue" numberOfLines={1}>
                {`en ${analisis.grupo_nombre}`}
              </Texto>
            )}
          </View>
        </Pressable>
        <Texto variante="titulo2">{`${analisis.puntos_bono}/100`}</Texto>
      </View>
      <Texto variante="etiqueta" color="textoTenue">
        {`${analisis.jornada_nombre} · ${textoPartido(analisis)}`}
      </Texto>
      <Texto variante="cuerpo">{analisis.justificacion}</Texto>
      <View style={{ gap: espacio.xxs }}>
        <Texto variante="etiqueta" color="textoTenue">
          Comentario de la IA
        </Texto>
        <Texto variante="cuerpo" color="texto2">
          {analisis.explicacion}
        </Texto>
      </View>
      {(analisis.en_curso || analisis.es_simulada) && (
        <Texto variante="meta" color="textoTenue">
          {[analisis.en_curso && HASTA_AHORA, analisis.es_simulada && 'Simulado'].filter(Boolean).join(' · ')}
        </Texto>
      )}
    </Pressable>
  );
}
