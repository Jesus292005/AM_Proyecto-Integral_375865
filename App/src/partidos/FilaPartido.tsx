import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Texto } from '../componentes';
import { formatearHora } from '../formato/fechas';
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
  const { espacio, medidas } = useTema();

  return (
    <View
      style={{
        flex: 1,
        flexDirection: lado === 'local' ? 'row' : 'row-reverse',
        alignItems: 'center',
        gap: espacio.xs,
      }}
    >
      {/* Desde la URL con caché en disco (B-R4); decorativo: la fila ya dice el nombre. */}
      <Image
        source={equipo.escudo_url}
        contentFit="contain"
        accessible={false}
        style={{ width: medidas.escudoLista, height: medidas.escudoLista }}
      />
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
  onPress: () => void;
}

/** Un partido de la lista: equipos, hora o marcador de 90 min (Q5) y estado (B4). */
export function FilaPartido({ partido, onPress }: Props) {
  const { colores, espacio, medidas } = useTema();
  const { local, visitante, goles_local, goles_visitante } = partido;
  const estado = textoEstado[partido.estado];
  // Marcador solo al terminar: en juego no hay marcador en vivo (B-R3).
  const marcador =
    partido.estado === 'TERMINADO' && goles_local !== null && goles_visitante !== null
      ? `${goles_local} - ${goles_visitante}`
      : null;
  const hora = formatearHora(new Date(partido.inicio));
  const descripcion = marcador
    ? `${local.nombre_corto} ${goles_local}, ${visitante.nombre_corto} ${goles_visitante}. ${estado}`
    : `${local.nombre_corto} contra ${visitante.nombre_corto}, ${hora}. ${estado}`;

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
        {/* Aquí entra el indicador "ya predije" (F03) y los puntos del partido (F10). */}
      </View>
      <Equipo equipo={visitante} lado="visitante" />
    </Pressable>
  );
}
