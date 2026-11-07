import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { Boton, Esqueleto, Seccion, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { datosDePrediccion } from '../partido/presentacion';
import { useTema } from '../tema';
import { obtenerMisGrupos, obtenerPrediccionesDelGrupo, type PrediccionAjena } from './datos';
import { mensajesGrupo } from './errores';
import { FotoUsuario } from './FotoUsuario';

type Equipos = { id: number; local: { nombre_corto: string }; visitante: { nombre_corto: string } };

function FilaPrediccion({ partido, prediccion }: { partido: Equipos; prediccion: PrediccionAjena }) {
  const { espacio } = useTema();
  const datos = datosDePrediccion(partido, prediccion);

  return (
    <View testID="prediccion-del-grupo" style={{ gap: espacio.xs, paddingVertical: espacio.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <FotoUsuario url={prediccion.foto_url} nombre={prediccion.nombre} />
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoFuerte" numberOfLines={1}>
            {prediccion.nombre}
          </Texto>
        </View>
      </View>
      {datos.map((dato) => (
        <Texto key={dato.etiqueta} variante="cuerpo">
          {`${dato.etiqueta}: ${dato.valor}`}
        </Texto>
      ))}
      {prediccion.justificacion !== null && (
        <Texto variante="cuerpo" color="texto2">
          {prediccion.justificacion}
        </Texto>
      )}
    </View>
  );
}

/**
 * S03 cerrado, "En tus grupos" (F07 R7): una fila por persona que comparte grupo conmigo y predijo
 * el partido. El servidor decide qué se ve (R04); sin grupos, la sección no se muestra.
 */
export function PrediccionesDelGrupo({ partido }: { partido: Equipos }) {
  const { espacio } = useTema();
  const misGrupos = useQuery({ queryKey: ['mis-grupos'], queryFn: obtenerMisGrupos });
  const enGrupos = (misGrupos.data?.length ?? 0) > 0;
  const predicciones = useQuery({
    queryKey: ['predicciones-grupo', partido.id],
    queryFn: () => obtenerPrediccionesDelGrupo(partido.id),
    enabled: enGrupos,
  });

  // Sin saber si estoy en un grupo (o sin grupos), la sección no ocupa lugar.
  if (!enGrupos) return null;

  let contenido;
  if (predicciones.data !== undefined) {
    contenido =
      predicciones.data.length === 0 ? (
        <Texto variante="cuerpo">{mensajesGrupo.nadiePredijo}</Texto>
      ) : (
        predicciones.data.map((p) => <FilaPrediccion key={p.usuario_id} partido={partido} prediccion={p} />)
      );
  } else if (predicciones.isError) {
    contenido = (
      <View style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(predicciones.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorPredicciones}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void predicciones.refetch()} />
      </View>
    );
  } else {
    contenido = (
      <View testID="predicciones-grupo-cargando" style={{ gap: espacio.xs }}>
        <Esqueleto variante="cuerpoFuerte" ancho="60%" />
        <Esqueleto variante="cuerpo" ancho="80%" />
      </View>
    );
  }

  return (
    <Seccion etiqueta="En tus grupos">
      <View style={{ gap: espacio.s }}>{contenido}</View>
    </Seccion>
  );
}
