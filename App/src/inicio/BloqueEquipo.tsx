import { router } from 'expo-router';
import { View } from 'react-native';

import { Boton, EncabezadoPartido, Esqueleto, Texto, type EstadoEncabezado } from '../componentes';
import { formatearDia, formatearHora } from '../formato/fechas';
import { contadorCierre, prediccionAbierta } from '../partido/eleccion';
import { useAhora } from '../partido/useAhora';
import type { MiPerfil } from '../perfil/datos';
import { useTema } from '../tema';
import { BloqueInicio, type Consulta } from './BloqueInicio';
import type { ProximoPartido } from './datos';

export const mensajesEquipo = {
  sinEquipo: 'Elige tu equipo favorito para seguir sus partidos aquí.',
  sinPartidos: (equipo: string) => `${equipo} no tiene más partidos en este torneo.`,
} as const;

function abrirPartido(id: number) {
  router.navigate({ pathname: '/partido/[partidoId]', params: { partidoId: String(id) } });
}

function Partido({ partido }: { partido: ProximoPartido }) {
  const { espacio } = useTema();
  const ahora = useAhora();
  const abierto = prediccionAbierta(partido, ahora);
  const enJuego = partido.estado === 'EN_JUEGO';
  const cierre = new Date(partido.cierre_predicciones);
  const inicio = new Date(partido.inicio);
  const estado: EstadoEncabezado = abierto
    ? { tipo: 'porJugar', cierre, contador: contadorCierre(cierre, ahora) }
    : { tipo: 'cerrado' };

  let accion;
  if (abierto) {
    accion = partido.tengo_prediccion ? (
      <Boton titulo="Ver tu predicción" variante="secundario" onPress={() => abrirPartido(partido.id)} />
    ) : (
      <Boton titulo="Predecir" onPress={() => abrirPartido(partido.id)} />
    );
  } else {
    accion = <Boton titulo="Ver partido" variante="secundario" onPress={() => abrirPartido(partido.id)} />;
  }

  return (
    <View style={{ gap: espacio.s }}>
      <Texto variante="etiqueta" color="textoTenue">
        {`${partido.jornada.nombre} · ${formatearDia(inicio)} · ${formatearHora(inicio)}`}
      </Texto>
      <EncabezadoPartido local={partido.local} visitante={partido.visitante} estado={estado} />
      {enJuego && <Texto variante="cuerpoFuerte">En juego</Texto>}
      {accion}
    </View>
  );
}

function EsqueletoEquipo() {
  const { espacio } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      <Esqueleto variante="etiqueta" ancho="50%" />
      <Esqueleto variante="titulo1" ancho="70%" />
      <Esqueleto variante="titulo1" ancho="70%" />
    </View>
  );
}

/** Bloque 2 · Tu equipo (F17 R6–R7). El equipo sale del perfil (F28 R7, misma caché). */
export function BloqueEquipo({
  consulta,
  sinTorneo,
}: {
  consulta: Consulta<[MiPerfil, ProximoPartido | null]>;
  sinTorneo: boolean;
}) {
  const { espacio } = useTema();

  return (
    <BloqueInicio
      etiqueta="Tu equipo"
      id="bloque-equipo"
      consulta={consulta}
      sinTorneo={sinTorneo}
      esqueleto={<EsqueletoEquipo />}
    >
      {([perfil, partido]) => {
        if (perfil.equipo === null) {
          return (
            <View style={{ gap: espacio.s }}>
              <Texto variante="cuerpo">{mensajesEquipo.sinEquipo}</Texto>
              <Boton titulo="Elegir equipo" variante="secundario" onPress={() => router.navigate('/equipo')} />
            </View>
          );
        }
        if (partido === null) {
          return <Texto variante="cuerpo">{mensajesEquipo.sinPartidos(perfil.equipo.nombre_corto)}</Texto>;
        }
        return <Partido partido={partido} />;
      }}
    </BloqueInicio>
  );
}
