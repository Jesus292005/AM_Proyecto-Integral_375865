// S11 Inicio (F17 v2): la barra superior (F25) y 5 bloques, cada uno con su consulta y sus estados
// (R1). Reemplaza la pantalla temporal de D103.
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { obtenerMisGrupos } from '../grupos/datos';
import { obtenerTorneoActual } from '../partidos/datos';
import { BarraSuperior } from '../perfil/BarraSuperior';
import { useMiPerfil } from '../perfil/useMiPerfil';
import { useReleerAlVolver } from '../perfil/useReleerAlVolver';
import { useTema } from '../tema';
import { combinar, mensajesInicio } from './BloqueInicio';
import { BloqueEquipo } from './BloqueEquipo';
import { BloquePendientes } from './BloquePendientes';
import { BloqueGrupos, BloqueMejorAnalisis, BloqueUltimaJornada } from './BloquesResultados';
import {
  obtenerMejorAnalisis,
  obtenerMiUltimaJornada,
  obtenerPendientes,
  obtenerProximoPartidoEquipo,
} from './datos';

export const clavesInicio = {
  pendientes: ['inicio', 'pendientes'],
  equipo: ['inicio', 'equipo'],
  ultimaJornada: ['inicio', 'ultima-jornada'],
  mejorAnalisis: ['inicio', 'mejor-analisis'],
} as const;

export function PantallaInicio() {
  const { colores, espacio, medidas } = useTema();
  const [refrescando, setRefrescando] = useState(false);

  // La misma caché que S02 (torneo) y S04 (mis grupos).
  const torneo = useQuery({ queryKey: ['torneo-actual'], queryFn: obtenerTorneoActual });
  const pendientes = useQuery({ queryKey: clavesInicio.pendientes, queryFn: obtenerPendientes });
  const perfil = useMiPerfil();
  const proximo = useQuery({ queryKey: clavesInicio.equipo, queryFn: obtenerProximoPartidoEquipo });
  const ultima = useQuery({ queryKey: clavesInicio.ultimaJornada, queryFn: obtenerMiUltimaJornada });
  const analisis = useQuery({ queryKey: clavesInicio.mejorAnalisis, queryFn: obtenerMejorAnalisis });
  const grupos = useQuery({ queryKey: ['mis-grupos'], queryFn: obtenerMisGrupos });

  const consultas = [torneo, pendientes, perfil, proximo, ultima, analisis, grupos];
  const { refetch: releerTorneo } = torneo;
  const { refetch: releerPendientes } = pendientes;
  const { refetch: releerProximo } = proximo;
  const { refetch: releerUltima } = ultima;
  const { refetch: releerAnalisis } = analisis;
  const { refetch: releerGrupos } = grupos;
  const releer = useCallback(
    () =>
      Promise.all([
        releerTorneo(),
        releerPendientes(),
        releerProximo(),
        releerUltima(),
        releerAnalisis(),
        releerGrupos(),
      ]),
    [releerTorneo, releerPendientes, releerProximo, releerUltima, releerAnalisis, releerGrupos],
  );

  // R2: al volver a la pestaña y al deslizar hacia abajo. El perfil lo vuelve a pedir la barra.
  useReleerAlVolver(releer);

  async function recargar() {
    setRefrescando(true);
    await Promise.all([releer(), perfil.refetch()]);
    setRefrescando(false);
  }

  // Sin torneo actual, los bloques 1–4 lo dicen (F17, estados).
  const sinTorneo = torneo.data === null;
  const sinConexion = consultas.some((c) => c.isError && esSinConexion(c.error));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      {/* F25 R1. */}
      <BarraSuperior />
      <ScrollView
        testID="inicio-desplazable"
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingTop: espacio.m,
          paddingBottom: espacio.xl,
          gap: espacio.l,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => void recargar()}
            colors={[colores.acento]}
            tintColor={colores.acento}
            progressBackgroundColor={colores.superficie}
          />
        }
      >
        <Texto variante="etiqueta" color="textoTenue" accessibilityRole="header">
          Inicio
        </Texto>
        {sinConexion && (
          <Texto variante="meta" color="fallo" accessibilityRole="alert">
            {mensajesInicio.avisoSinConexion}
          </Texto>
        )}
        <BloquePendientes consulta={pendientes} sinTorneo={sinTorneo} />
        <BloqueEquipo consulta={combinar(perfil, proximo)} sinTorneo={sinTorneo} />
        <BloqueUltimaJornada consulta={ultima} grupos={grupos.data} sinTorneo={sinTorneo} />
        <BloqueMejorAnalisis
          consulta={analisis}
          grupos={grupos.data}
          ultimaJornada={ultima.data}
          esperandoVacio={grupos.isPending || ultima.isPending}
          sinTorneo={sinTorneo}
        />
        <BloqueGrupos consulta={grupos} />
      </ScrollView>
    </SafeAreaView>
  );
}
