import { Pressable, View } from 'react-native';

import { EscudoEquipo, Texto } from '../componentes';
import { formatearHora } from '../formato/fechas';
import type { PuntosPrediccion } from '../puntos/datos';
import { descripcionEnFila, estadoEnFila, PuntosEnFila } from '../puntos/PuntosEnFila';
import { useTema } from '../tema';
import type { EquipoDePartido, EstadoPartido, PartidoDeLista } from './datos';

// F02 B4.
export const textoEstado: Record<EstadoPartido, string> = {
  PROGRAMADO: 'Por jugar',
  EN_JUEGO: 'En juego',
  TERMINADO: 'Terminado',
  POSPUESTO: 'Pospuesto',
  CANCELADO: 'Cancelado',
};

function Equipo({ equipo, lado }: { equipo: EquipoDePartido; lado: 'local' | 'visitante' }) {
  const { espacio } = useTema();

  return (
    <View
      style={{
        flex: 1,
        flexDirection: lado === 'local' ? 'row' : 'row-reverse',
        alignItems: 'center',
        gap: espacio.xs,
      }}
    >
      {/* Con caché en disco (B-R4) y respaldo con la inicial (F22 R3). */}
      <EscudoEquipo equipo={equipo} tamano="escudoLista" />
      <Texto
        variante="cuerpoFuerte"
        numberOfLines={1}
        alineacion={lado === 'local' ? 'left' : 'right'}
      >
        {equipo.nombre_corto}
      </Texto>
    </View>
  );
}

interface Props {
  partido: PartidoDeLista;
  /** Mis puntos del partido (F10); sin cargar o sin predicción, `undefined`. */
  puntos?: PuntosPrediccion;
  onPress: () => void;
}

/** Un partido de la lista: equipos, hora o marcador de 90 min (Q5) y estado (B4). */
export function FilaPartido({ partido, puntos, onPress }: Props) {
  const { colores, espacio, medidas } = useTema();
  const { local, visitante, goles_local, goles_visitante } = partido;
  const estado = textoEstado[partido.estado];
  // Marcador solo al terminar: en juego no hay marcador en vivo (B-R3).
  const marcador =
    partido.estado === 'TERMINADO' && goles_local !== null && goles_visitante !== null
      ? `${goles_local} - ${goles_visitante}`
      : null;
  const hora = formatearHora(new Date(partido.inicio));
  const mio = estadoEnFila(partido.estado, partido.predicho, puntos);
  const descripcion = [
    marcador
      ? `${local.nombre_corto} ${goles_local}, ${visitante.nombre_corto} ${goles_visitante}. ${estado}`
      : `${local.nombre_corto} contra ${visitante.nombre_corto}, ${hora}. ${estado}`,
    partido.es_simulado && 'Simulado',
    descripcionEnFila(mio),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.s,
        minHeight: medidas.areaTactil,
        paddingVertical: espacio.s,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.lineaSuave,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <Equipo equipo={local} lado="local" />
      <View style={{ alignItems: 'center', gap: espacio.xxs }}>
        {marcador ? (
          <Texto variante="numero">{marcador}</Texto>
        ) : (
          <Texto variante="cuerpoFuerte">{hora}</Texto>
        )}
        <Texto variante="meta" color="textoTenue">
          {estado}
        </Texto>
        {/* Decisión 2 (D90): todos ven los simulados, marcados. */}
        {partido.es_simulado && (
          <Texto variante="etiqueta" color="texto2">
            Simulado
          </Texto>
        )}
        {/* "Predicho" (F03) o mis puntos del partido (F10 R3). */}
        <PuntosEnFila estado={mio} />
      </View>
      <Equipo equipo={visitante} lado="visitante" />
    </Pressable>
  );
}
