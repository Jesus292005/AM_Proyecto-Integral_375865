import { View } from 'react-native';

import { Icono, IndicadorEstado, Texto } from '../componentes';
import { useTema } from '../tema';
import type { EstadoPartido } from '../partidos/datos';
import type { PuntosPrediccion } from './datos';
import {
  esCalificada,
  indicadorPrediccion,
  type PuntosCalificados,
  textoPrediccion,
  textos,
} from './presentacion';

// F10 R3: lo que la tarjeta de S02 muestra de mi predicción. En un partido sin terminar se queda el
// indicador "Predicho" de F03; en uno terminado o cancelado, sin puntos cargados no se muestra nada.

type Estado =
  | { tipo: 'calificado'; puntos: PuntosCalificados; texto: string }
  | { tipo: 'calificando' }
  | { tipo: 'anulado' }
  | { tipo: 'predicho' }
  | { tipo: 'nada' };

export function estadoEnFila(
  estadoPartido: EstadoPartido,
  predicho: boolean,
  puntos: PuntosPrediccion | undefined,
): Estado {
  const terminado = estadoPartido === 'TERMINADO';
  if (puntos !== undefined && esCalificada(puntos)) {
    return { tipo: 'calificado', puntos, texto: textoPrediccion[puntos.estado_prediccion] };
  }
  if (puntos?.estado_prediccion === 'ANULADA') return { tipo: 'anulado' };
  if (terminado && puntos?.estado_prediccion === 'SIN_CALIFICAR') return { tipo: 'calificando' };
  const sinTerminar = !terminado && estadoPartido !== 'CANCELADO';
  return predicho && sinTerminar ? { tipo: 'predicho' } : { tipo: 'nada' };
}

/** Texto para lectores de pantalla (se suma a la descripción de la fila). */
export function descripcionEnFila(estado: Estado): string | null {
  switch (estado.tipo) {
    case 'calificado':
      return [
        `${estado.texto}, ${estado.puntos.puntos_total} puntos`,
        estado.puntos.estado_bono === 'PENDIENTE' && textos.bonoPendienteCorto,
      ]
        .filter(Boolean)
        .join(', ');
    case 'calificando':
      return textos.calificando;
    case 'anulado':
      return textos.anulado;
    case 'predicho':
      return 'Predicho';
    case 'nada':
      return null;
  }
}

export function PuntosEnFila({ estado }: { estado: Estado }) {
  const { espacio } = useTema();

  switch (estado.tipo) {
    case 'calificado':
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs }}>
            <IndicadorEstado estado={indicadorPrediccion[estado.puntos.estado_prediccion]} />
            <Texto variante="numero" color="texto">{`+${estado.puntos.puntos_total}`}</Texto>
          </View>
          {estado.puntos.estado_bono === 'PENDIENTE' && (
            <Texto variante="meta" color="pendiente">
              {textos.bonoPendienteCorto}
            </Texto>
          )}
        </View>
      );
    case 'calificando':
      return (
        <Texto variante="meta" color="textoTenue">
          {textos.calificando}
        </Texto>
      );
    case 'anulado':
      return (
        <Texto variante="meta" color="textoTenue">
          {textos.anulado}
        </Texto>
      );
    case 'predicho':
      // Ícono + texto, no solo color (U5).
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs }}>
          <Icono nombre="check" color="acento" />
          <Texto variante="meta" color="acento">
            Predicho
          </Texto>
        </View>
      );
    case 'nada':
      return null;
  }
}
