import { View } from 'react-native';

import { formatearDia, formatearHora } from '../formato/fechas';
import { useTema } from '../tema';
import { EscudoEquipo, type EquipoConEscudo } from './EscudoEquipo';
import { Texto } from './Texto';

export type EstadoEncabezado =
  /** `contador` "hh:mm:ss" con menos de 24 h; null con más (se muestra la fecha, F03 R8). */
  | { tipo: 'porJugar'; cierre: Date; contador: string | null }
  | { tipo: 'cerrado' }
  | { tipo: 'terminado'; golesLocal: number; golesVisitante: number };

interface Props {
  local: EquipoConEscudo;
  visitante: EquipoConEscudo;
  estado: EstadoEncabezado;
}

function FilaEquipo({
  equipo,
  lado,
  goles,
}: {
  equipo: EquipoConEscudo;
  lado: 'local' | 'visitante';
  goles?: number;
}) {
  const { colores, espacio, medidas } = useTema();
  // F22 R5: escudo a un lado del nombre, a la izquierda el del local y a la derecha el del visitante.
  const escudo = <EscudoEquipo equipo={equipo} tamano="escudoEncabezado" />;

  return (
    <View
      testID={`encabezado-${lado}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}
    >
      {/* Franja del color del equipo (D68, F22 R4); sin dato, neutra (D70). */}
      <View
        testID={`franja-${lado}`}
        style={{
          alignSelf: 'stretch',
          width: medidas.barraActiva,
          backgroundColor: equipo.color_primario ?? colores.textoTenue,
        }}
      />
      {lado === 'local' && escudo}
      <View style={{ flexShrink: 1 }}>
        <Texto variante="titulo1" numberOfLines={1} adjustsFontSizeToFit>
          {equipo.nombre_corto}
        </Texto>
      </View>
      {lado === 'visitante' && escudo}
      <View style={{ flex: 1 }} />
      {goles !== undefined && <Texto variante="titulo1">{String(goles)}</Texto>}
    </View>
  );
}

function Cierre({ estado }: { estado: EstadoEncabezado }) {
  const { espacio } = useTema();

  if (estado.tipo === 'cerrado') {
    return (
      <Texto variante="meta" color="textoTenue">
        Predicciones cerradas
      </Texto>
    );
  }
  if (estado.tipo !== 'porJugar') return null;
  if (estado.contador === null) {
    const fecha = `${formatearDia(estado.cierre)} · ${formatearHora(estado.cierre)}`;
    return (
      <Texto variante="meta" color="textoTenue">
        {`Cierra el ${fecha}`}
      </Texto>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: espacio.xs }}>
      <Texto variante="meta" color="textoTenue">
        Cierra en
      </Texto>
      <Texto variante="titulo2">{estado.contador}</Texto>
    </View>
  );
}

/**
 * Encabezado del partido, variante 2 (D68): equipos con su franja y su escudo (F22 R5), "vs" y el
 * cierre debajo.
 */
export function EncabezadoPartido({ local, visitante, estado }: Props) {
  const { espacio } = useTema();
  const terminado = estado.tipo === 'terminado' ? estado : null;
  const nombre = terminado
    ? `${local.nombre_corto} ${terminado.golesLocal}, ${visitante.nombre_corto} ${terminado.golesVisitante}`
    : `${local.nombre_corto} contra ${visitante.nombre_corto}`;

  return (
    <View style={{ gap: espacio.m }}>
      <View accessible accessibilityRole="header" accessibilityLabel={nombre} style={{ gap: espacio.xxs }}>
        <FilaEquipo equipo={local} lado="local" goles={terminado?.golesLocal} />
        <Texto variante="pestana" color="textoTenue">
          vs
        </Texto>
        <FilaEquipo equipo={visitante} lado="visitante" goles={terminado?.golesVisitante} />
      </View>
      <Cierre estado={estado} />
    </View>
  );
}
