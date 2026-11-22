import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Esqueleto, EstadoPantalla, FotoUsuario, TablaFila, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import type { FilaRanking, Ranking } from './datos';
import { ErrorGrupo, mensajesGrupo } from './errores';

export type Vista = 'torneo' | 'jornada';

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
  /** Del torneo (pestaña Ranking) o de la jornada elegida (pestaña Jornada, F26 decisión 4). */
  vista: Vista;
  ranking: { datos: Ranking | undefined; error: Error | null; reintentar: () => void };
  /** Jornada sin partidos o torneo sin jornadas: el texto reemplaza al ranking (F08 Estados). */
  vacio?: string;
}

/** S08, ranking del grupo (F08 R9): una fila por miembro con su posición y puntos. */
export function RankingGrupo({ vista, ranking, vacio }: Props) {
  const { espacio } = useTema();

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
    const codigo = ranking.error instanceof ErrorGrupo ? ranking.error.codigo : null;
    if (codigo === 'SIN_TORNEO_ACTUAL') contenido = <EstadoPantalla mensaje={mensajesGrupo.sinTorneo} />;
    else if (codigo === 'NO_MIEMBRO') {
      contenido = (
        <EstadoPantalla
          mensaje={mensajesGrupo.noMiembro}
          accion={{ titulo: 'Ir a Grupos', onPress: () => router.navigate('/grupos') }}
        />
      );
    } else contenido = (
      <EstadoPantalla
        mensaje={esSinConexion(ranking.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorRanking}
        accion={{ titulo: 'Reintentar', onPress: ranking.reintentar }}
      />
    );
  } else {
    contenido = <EsqueletoRanking />;
  }

  return <>{contenido}</>;
}
