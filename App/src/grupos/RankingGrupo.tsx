import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Esqueleto, EstadoPantalla, PestanasTexto, TablaFila, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { SelectorJornada } from '../partidos/SelectorJornada';
import { useTema } from '../tema';
import type { FilaRanking, Ranking } from './datos';
import { ErrorGrupo, mensajesGrupo } from './errores';
import { FotoUsuario } from './FotoUsuario';

export type Vista = 'torneo' | 'jornada';

const pestanas: readonly { valor: Vista; titulo: string }[] = [
  { valor: 'torneo', titulo: 'Torneo' },
  { valor: 'jornada', titulo: 'Jornada' },
];

function Fila({ fila }: { fila: FilaRanking }) {
  const { medidas } = useTema();
  const puntos = fila.puntos_total === 1 ? '1 punto' : `${fila.puntos_total} puntos`;

  return (
    <TablaFila
      resaltada={fila.es_yo}
      accessibilityLabel={`${fila.posicion}.º, ${fila.nombre}${fila.es_yo ? ', tú' : ''}, ${puntos}`}
    >
      <View style={{ width: medidas.areaTactil }}>
        <Texto variante="numero" color={fila.es_yo ? 'acento' : 'texto'}>
          {fila.posicion}
        </Texto>
      </View>
      <FotoUsuario url={fila.foto_url} nombre={fila.nombre} />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {fila.nombre}
        </Texto>
      </View>
      <Texto variante="numero" alineacion="right">
        {fila.puntos_total}
      </Texto>
    </TablaFila>
  );
}

function EsqueletoRanking() {
  const { espacio } = useTema();

  return (
    <View testID="ranking-cargando" style={{ gap: espacio.s }}>
      <Esqueleto variante="cuerpoFuerte" ancho="90%" />
      <Esqueleto variante="cuerpoFuerte" ancho="85%" />
      <Esqueleto variante="cuerpoFuerte" ancho="80%" />
    </View>
  );
}

interface Props {
  vista: Vista;
  /** La jornada elegida en la vista "Jornada" con su torneo; undefined mientras carga. */
  jornada?: { nombre: string; torneo: string; anterior?: number; siguiente?: number };
  ranking: { datos: Ranking | undefined; error: Error | null; reintentar: () => void };
  /** Jornada sin partidos o torneo sin jornadas: el texto reemplaza al ranking (F08 Estados). */
  vacio?: string;
}

/**
 * S08, ranking del grupo (F08 R9): pestañas Torneo / Jornada, selector de jornada y una fila por
 * miembro con su posición y puntos. Cambiar de vista o de jornada no agrega historial (D78).
 */
export function RankingGrupo({ vista, jornada, ranking, vacio }: Props) {
  const { espacio } = useTema();
  const irAJornada = (orden: number | undefined) =>
    orden === undefined ? undefined : () => router.setParams({ jornada: String(orden) });

  let contenido: ReactNode;
  if (vacio !== undefined) {
    contenido = <Texto variante="cuerpo">{vacio}</Texto>;
  } else if (ranking.datos !== undefined) {
    const { filas, incluyeSimulados } = ranking.datos;
    const sinPuntos = filas.every((f) => f.puntos_total === 0);
    contenido = (
      <View style={{ gap: espacio.s }}>
        {sinPuntos && (
          <Texto variante="cuerpo" color="texto2">
            {vista === 'torneo' ? mensajesGrupo.sinPuntosTorneo : mensajesGrupo.sinPuntosJornada}
          </Texto>
        )}
        <View>
          {filas.map((fila) => (
            <Fila key={fila.usuario_id} fila={fila} />
          ))}
        </View>
        <Texto variante="meta" color="textoTenue">
          {mensajesGrupo.notaRanking}
        </Texto>
        {incluyeSimulados && (
          <Texto variante="meta" color="textoTenue">
            {mensajesGrupo.incluyeSimulados}
          </Texto>
        )}
      </View>
    );
  } else if (ranking.error !== null) {
    const sinTorneo = ranking.error instanceof ErrorGrupo && ranking.error.codigo === 'SIN_TORNEO_ACTUAL';
    contenido = sinTorneo ? (
      <EstadoPantalla mensaje={mensajesGrupo.sinTorneo} />
    ) : (
      <EstadoPantalla
        mensaje={esSinConexion(ranking.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorRanking}
        accion={{ titulo: 'Reintentar', onPress: ranking.reintentar }}
      />
    );
  } else {
    contenido = <EsqueletoRanking />;
  }

  return (
    <View style={{ gap: espacio.m }}>
      <PestanasTexto
        pestanas={pestanas}
        activa={vista}
        onCambiar={(valor) => router.setParams({ vista: valor })}
      />
      {vista === 'jornada' && jornada !== undefined && (
        <SelectorJornada
          nombre={jornada.nombre}
          torneo={jornada.torneo}
          onAnterior={irAJornada(jornada.anterior)}
          onSiguiente={irAJornada(jornada.siguiente)}
        />
      )}
      {contenido}
    </View>
  );
}
