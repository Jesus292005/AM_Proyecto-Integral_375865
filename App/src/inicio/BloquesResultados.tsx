import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Esqueleto, FotoUsuario, Icono, TablaFila, Texto, Boton } from '../componentes';
import type { MiGrupo } from '../grupos/datos';
import { useTema } from '../tema';
import { BloqueInicio, type Consulta } from './BloqueInicio';
import type { MejorAnalisis, UltimaJornada } from './datos';

// Bloques 3, 4 y 5 de S11 (F17 R8–R12).

export const mensajesResultados = {
  sinCalificados: 'Aún no hay partidos calificados en este torneo.',
  sinPrediccion: (jornada: string) => `No predijiste en la ${jornada}.`,
  sinAnalisis: 'Sin análisis evaluado',
  enCurso: 'En curso',
  hastaAhora: 'Hasta ahora',
  simulados: 'Incluye partidos simulados',
  sinGruposAnalisis: 'Únete a un grupo para ver el mejor análisis de la jornada.',
  nadieLlego: (jornada: string | null) =>
    jornada === null ? 'Nadie de tus grupos llegó a 50 en esta jornada.' : `Nadie de tus grupos llegó a 50 en la ${jornada}.`,
  sinGrupos: 'Compite con tus amigos en un grupo.',
  sinPuntos: 'Sin puntos aún',
} as const;

const textoMiembros = (n: number) => (n === 1 ? '1 miembro' : `${n} miembros`);
const textoBonos = (n: number) => (n === 1 ? '1 bono pendiente' : `${n} bonos pendientes`);

function abrirPartido(id: number) {
  router.navigate({ pathname: '/partido/[partidoId]', params: { partidoId: String(id) } });
}

function EsqueletoFilas({ filas }: { filas: number }) {
  const { espacio } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} variante="cuerpoFuerte" ancho="80%" />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bloque 3 · Mi última jornada (R8–R9)
// ---------------------------------------------------------------------------

/** Cambio de posición en un grupo: menor número = mejor lugar. */
export function cambioDePosicion(grupo: MiGrupo): { tipo: 'subio' | 'bajo' | 'igual'; lugares: number } | null {
  if (grupo.mi_posicion === null || grupo.mi_posicion_antes === null) return null;
  const lugares = grupo.mi_posicion_antes - grupo.mi_posicion;
  if (lugares > 0) return { tipo: 'subio', lugares };
  if (lugares < 0) return { tipo: 'bajo', lugares: -lugares };
  return { tipo: 'igual', lugares: 0 };
}

function FilaCambio({ grupo }: { grupo: MiGrupo }) {
  const { espacio } = useTema();
  const cambio = cambioDePosicion(grupo);
  if (cambio === null || grupo.mi_posicion === null) return null;
  const texto =
    cambio.tipo === 'subio' ? `Subiste ${cambio.lugares}` : cambio.tipo === 'bajo' ? `Bajaste ${cambio.lugares}` : 'Igual';

  return (
    <View
      accessible
      accessibilityLabel={`${grupo.nombre}, vas ${grupo.mi_posicion}.º. ${texto}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xs }}
    >
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpo" numberOfLines={1}>
          {`${grupo.nombre} · ${grupo.mi_posicion}.º`}
        </Texto>
      </View>
      {cambio.tipo === 'subio' && <Icono nombre="flechaArriba" color="acierto" />}
      {cambio.tipo === 'bajo' && <Icono nombre="flechaAbajo" color="fallo" />}
      <Texto
        variante="meta"
        color={cambio.tipo === 'subio' ? 'acierto' : cambio.tipo === 'bajo' ? 'fallo' : 'textoTenue'}
      >
        {texto}
      </Texto>
    </View>
  );
}

function UltimaJornadaContenido({ jornada, grupos }: { jornada: UltimaJornada; grupos: MiGrupo[] | undefined }) {
  const { espacio } = useTema();
  const mejor = jornada.mejor_analisis_partido_id;

  return (
    <View style={{ gap: espacio.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: espacio.xs }}>
        <View style={{ flexShrink: 1 }}>
          <Texto variante="cuerpoFuerte" numberOfLines={1}>
            {jornada.jornada_nombre}
          </Texto>
        </View>
        {jornada.en_curso && (
          <Texto variante="etiqueta" color="texto2">
            {mensajesResultados.enCurso}
          </Texto>
        )}
      </View>
      {jornada.predicciones_calificadas === 0 ? (
        <Texto variante="cuerpo">{mensajesResultados.sinPrediccion(jornada.jornada_nombre)}</Texto>
      ) : (
        <>
          <View
            accessible
            accessibilityLabel={`${jornada.puntos_total} puntos: base ${jornada.puntos_base} más bono ${jornada.puntos_bono}`}
          >
            <Texto variante="marcadorXL">{String(jornada.puntos_total)}</Texto>
            <Texto variante="meta" color="textoTenue">
              {`base ${jornada.puntos_base} + bono ${jornada.puntos_bono}`}
            </Texto>
          </View>
          {jornada.bonos_pendientes > 0 && (
            <Texto variante="meta" color="textoTenue">
              {textoBonos(jornada.bonos_pendientes)}
            </Texto>
          )}
          {mejor !== null && jornada.mejor_analisis_bono !== null ? (
            <TablaFila
              accessibilityLabel={`Tu mejor análisis: ${jornada.mejor_analisis_bono} de 100. Ver el partido`}
              onPress={() => abrirPartido(mejor)}
            >
              <View style={{ flex: 1 }}>
                <Texto variante="cuerpo">{`Tu mejor análisis: ${jornada.mejor_analisis_bono}/100`}</Texto>
              </View>
              <Icono nombre="chevronDerecha" color="textoTenue" />
            </TablaFila>
          ) : (
            <Texto variante="meta" color="textoTenue">
              {mensajesResultados.sinAnalisis}
            </Texto>
          )}
        </>
      )}
      {/* R9: con la consulta del bloque 5; si falla, solo los puntos. */}
      {grupos?.map((g) => <FilaCambio key={g.id} grupo={g} />)}
      {jornada.incluye_simulados && (
        <Texto variante="meta" color="textoTenue">
          {mensajesResultados.simulados}
        </Texto>
      )}
    </View>
  );
}

export function BloqueUltimaJornada({
  consulta,
  grupos,
  sinTorneo,
}: {
  consulta: Consulta<UltimaJornada | null>;
  /** Para "subiste / bajaste" (R9); si no llegaron, el bloque muestra solo los puntos. */
  grupos: MiGrupo[] | undefined;
  sinTorneo: boolean;
}) {
  const { espacio } = useTema();

  return (
    <BloqueInicio
      etiqueta="Mi última jornada"
      id="bloque-ultima-jornada"
      consulta={consulta}
      sinTorneo={sinTorneo}
      esqueleto={
        <View style={{ gap: espacio.s }}>
          <Esqueleto variante="marcadorXL" ancho="30%" />
          <EsqueletoFilas filas={2} />
        </View>
      }
    >
      {(jornada) =>
        jornada === null ? (
          <Texto variante="cuerpo">{mensajesResultados.sinCalificados}</Texto>
        ) : (
          <UltimaJornadaContenido jornada={jornada} grupos={grupos} />
        )
      }
    </BloqueInicio>
  );
}

// ---------------------------------------------------------------------------
// Bloque 4 · Mejor análisis de la jornada en mis grupos (R10–R11)
// ---------------------------------------------------------------------------

function textoPartido(a: MejorAnalisis): string {
  return a.goles_local === null || a.goles_visitante === null
    ? `${a.local.nombre_corto} vs ${a.visitante.nombre_corto}`
    : `${a.local.nombre_corto} ${a.goles_local} - ${a.goles_visitante} ${a.visitante.nombre_corto}`;
}

function TarjetaAnalisis({ analisis }: { analisis: MejorAnalisis }) {
  const { colores, espacio, medidas } = useTema();
  const quien = analisis.es_yo ? 'Tú' : analisis.nombre;

  return (
    <Pressable
      onPress={() => abrirPartido(analisis.partido_id)}
      accessibilityRole="button"
      accessibilityLabel={[
        `Mejor análisis: ${quien} en ${analisis.grupo_nombre}, ${analisis.puntos_bono} de 100`,
        textoPartido(analisis),
        analisis.justificacion,
        `Comentario de la IA: ${analisis.explicacion}`,
        analisis.en_curso && mensajesResultados.hastaAhora,
        analisis.es_simulada && 'Simulado',
        'Ver el partido',
      ]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => ({
        gap: espacio.s,
        padding: espacio.m,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <FotoUsuario url={analisis.foto_url} nombre={analisis.nombre} />
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoFuerte" numberOfLines={1}>
            {quien}
          </Texto>
          <Texto variante="meta" color="textoTenue" numberOfLines={1}>
            {`en ${analisis.grupo_nombre}`}
          </Texto>
        </View>
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
          {[analisis.en_curso && mensajesResultados.hastaAhora, analisis.es_simulada && 'Simulado']
            .filter(Boolean)
            .join(' · ')}
        </Texto>
      )}
    </Pressable>
  );
}

export function BloqueMejorAnalisis({
  consulta,
  grupos,
  ultimaJornada,
  esperandoVacio,
  sinTorneo,
}: {
  consulta: Consulta<MejorAnalisis | null>;
  /** Solo para el vacío "Únete a un grupo…": si no llegaron, el bloque no falla por eso (R1). */
  grupos: MiGrupo[] | undefined;
  /** La jornada de referencia (R3) para los vacíos; null = no hay partidos calificados. */
  ultimaJornada: UltimaJornada | null | undefined;
  /** Mis grupos o la jornada de referencia siguen cargando: el vacío espera para no cambiar de texto. */
  esperandoVacio: boolean;
  sinTorneo: boolean;
}) {
  return (
    <BloqueInicio
      etiqueta="Mejor análisis de la jornada"
      id="bloque-mejor-analisis"
      consulta={consulta}
      sinTorneo={sinTorneo}
      esqueleto={<EsqueletoFilas filas={3} />}
    >
      {(analisis) => {
        if (analisis !== null) return <TarjetaAnalisis analisis={analisis} />;
        if (esperandoVacio) return <View testID="bloque-mejor-analisis-cargando"><EsqueletoFilas filas={3} /></View>;
        let mensaje: string;
        if (grupos?.length === 0) mensaje = mensajesResultados.sinGruposAnalisis;
        else if (ultimaJornada === null) mensaje = mensajesResultados.sinCalificados;
        else mensaje = mensajesResultados.nadieLlego(ultimaJornada?.jornada_nombre ?? null);
        return <Texto variante="cuerpo">{mensaje}</Texto>;
      }}
    </BloqueInicio>
  );
}

// ---------------------------------------------------------------------------
// Bloque 5 · Mis grupos con mi posición (R12)
// ---------------------------------------------------------------------------

const textoPosicion = (g: MiGrupo) =>
  g.mi_posicion === null ? mensajesResultados.sinPuntos : `Vas ${g.mi_posicion}.º de ${g.miembros}`;

export function BloqueGrupos({ consulta }: { consulta: Consulta<MiGrupo[]> }) {
  const { espacio } = useTema();

  return (
    <BloqueInicio etiqueta="Mis grupos" id="bloque-grupos" consulta={consulta} esqueleto={<EsqueletoFilas filas={2} />}>
      {(grupos) =>
        grupos.length === 0 ? (
          <View style={{ gap: espacio.s }}>
            <Texto variante="cuerpo">{mensajesResultados.sinGrupos}</Texto>
            <Boton titulo="Crear grupo" onPress={() => router.navigate('/grupos/nuevo')} />
            <Boton titulo="Unirse" variante="secundario" onPress={() => router.navigate('/grupos/unirse')} />
          </View>
        ) : (
          <View>
            {grupos.map((grupo) => (
              <TablaFila
                key={grupo.id}
                accessibilityLabel={`${grupo.nombre}, ${textoMiembros(grupo.miembros)}, ${textoPosicion(grupo)}`}
                onPress={() =>
                  router.navigate({ pathname: '/grupo/[grupoId]', params: { grupoId: String(grupo.id) } })
                }
              >
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpoFuerte" numberOfLines={1}>
                    {grupo.nombre}
                  </Texto>
                  <Texto variante="meta" color="textoTenue">
                    {textoMiembros(grupo.miembros)}
                  </Texto>
                </View>
                <Texto variante="cuerpoFuerte" color={grupo.mi_posicion === null ? 'textoTenue' : 'texto'}>
                  {textoPosicion(grupo)}
                </Texto>
              </TablaFila>
            ))}
          </View>
        )
      }
    </BloqueInicio>
  );
}
