import { View } from 'react-native';

import { formatearDia, formatearHora } from '../formato/fechas';
import { useTema } from '../tema';
import { Texto } from './Texto';

type Equipo = { nombre: string; color: string | null };

export type EstadoEncabezado =
  /** `contador` "hh:mm:ss" con menos de 24 h; null con más (se muestra la fecha, F03 R8). */
  | { tipo: 'porJugar'; cierre: Date; contador: string | null }
  | { tipo: 'cerrado' }
  | { tipo: 'terminado'; golesLocal: number; golesVisitante: number };

interface Props {
  local: Equipo;
  visitante: Equipo;
  estado: EstadoEncabezado;
}

function FilaEquipo({ equipo, goles }: { equipo: Equipo; goles?: number }) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
      {/* Franja del color del equipo (D68); sin dato, neutra (D70). */}
      <View
        style={{
          alignSelf: 'stretch',
          width: medidas.barraActiva,
          backgroundColor: equipo.color ?? colores.textoTenue,
        }}
      />
      <View style={{ flex: 1 }}>
        <Texto variante="titulo1" numberOfLines={1} adjustsFontSizeToFit>
          {equipo.nombre}
        </Texto>
      </View>
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

/** Encabezado del partido, variante 2 (D68): equipos con su franja, "vs" y el cierre debajo. */
export function EncabezadoPartido({ local, visitante, estado }: Props) {
  const { espacio } = useTema();
  const terminado = estado.tipo === 'terminado' ? estado : null;
  const nombre = terminado
    ? `${local.nombre} ${terminado.golesLocal}, ${visitante.nombre} ${terminado.golesVisitante}`
    : `${local.nombre} contra ${visitante.nombre}`;

  return (
    <View style={{ gap: espacio.m }}>
      <View accessible accessibilityRole="header" accessibilityLabel={nombre} style={{ gap: espacio.xxs }}>
        <FilaEquipo equipo={local} goles={terminado?.golesLocal} />
        <Texto variante="pestana" color="textoTenue">
          vs
        </Texto>
        <FilaEquipo equipo={visitante} goles={terminado?.golesVisitante} />
      </View>
      <Cierre estado={estado} />
    </View>
  );
}
