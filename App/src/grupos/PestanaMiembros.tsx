import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Share, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Boton, Esqueleto, EstadoPantalla, FotoUsuario, Icono, Seccion, TablaFila, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { abrirPerfil } from '../inicio/TarjetaAnalisis';
import { useTema } from '../tema';
import { formatearCodigo } from './codigo';
import { obtenerFaltan, obtenerRanking, obtenerRoles, salirDeGrupo, type FilaRanking, type GrupoDetalle } from './datos';
import { ErrorGrupo, mensajeAlSalir, mensajesGrupo } from './errores';

/**
 * QR con el código canónico, solo texto (F12 R1, R2, D37): módulos `fondo` sobre `texto` (los
 * lectores no siempre leen QR invertidos) y 4 módulos de margen (un QR versión 1 tiene 21 de lado).
 */
function QRInvitacion({ codigo }: { codigo: string }) {
  const { colores, medidas } = useTema();
  const { width } = useWindowDimensions();
  const lado = Math.min(medidas.qrInvitacion, width - 2 * medidas.margenPantalla);
  const margen = Math.round((lado * 4) / 29);

  return (
    <View accessible accessibilityLabel="Código QR del grupo" testID="qr-invitacion" style={{ alignSelf: 'center' }}>
      <QRCode
        value={formatearCodigo(codigo)}
        size={lado - 2 * margen}
        quietZone={margen}
        color={colores.fondo}
        backgroundColor={colores.texto}
      />
    </View>
  );
}

/** Código, QR y "Compartir invitación" con la hoja nativa (F07 R10, F12 R2, F26 R17); salir (F07). */
function InvitarYSalir({ grupo }: { grupo: GrupoDetalle }) {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const [falloCompartir, setFalloCompartir] = useState(false);
  const codigo = formatearCodigo(grupo.codigo_invitacion);
  const salida = useMutation({
    mutationFn: () => salirDeGrupo(grupo.id),
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['mis-grupos'] });
      clienteConsultas.removeQueries({ queryKey: ['grupo', grupo.id] });
      // F07 R5: dejo de ver al instante las predicciones de quienes ya no comparten grupo conmigo.
      clienteConsultas.removeQueries({ queryKey: ['predicciones-grupo'] });
      router.navigate('/grupos');
    },
  });

  async function compartir() {
    setFalloCompartir(false);
    try {
      // Cancelar la hoja no es error (F26 R17); sin enlace (decisión 3).
      await Share.share({ message: mensajesGrupo.invitacion(grupo.nombre, codigo) });
    } catch {
      setFalloCompartir(true);
    }
  }

  function confirmarSalida() {
    Alert.alert(
      '¿Salir del grupo?',
      `Dejarás de ver las predicciones de ${grupo.nombre} y saldrás de su ranking.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => salida.mutate() },
      ],
    );
  }

  return (
    <>
      <Seccion etiqueta="Invitar">
        <Texto variante="titulo2" selectable accessibilityLabel={`Código ${codigo.split('').join(' ')}`}>
          {codigo}
        </Texto>
        <QRInvitacion codigo={grupo.codigo_invitacion} />
        <Texto variante="meta" color="textoTenue">
          Muéstralo para que lo escaneen desde Unirse a un grupo.
        </Texto>
        <Boton titulo={mensajesGrupo.compartir} variante="secundario" icono="compartir" onPress={() => void compartir()} />
        {falloCompartir && (
          <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
            {mensajesGrupo.falloCompartir}
          </Texto>
        )}
      </Seccion>
      <View style={{ gap: espacio.xs }}>
        <Boton titulo="Salir del grupo" variante="secundario" onPress={confirmarSalida} cargando={salida.isPending} />
        {salida.error && (
          <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
            {mensajeAlSalir(salida.error)}
          </Texto>
        )}
      </View>
    </>
  );
}

function Estado({ faltan }: { faltan: number }) {
  const { espacio } = useTema();
  if (faltan === 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs }}>
        <Icono nombre="check" color="acierto" />
        <Texto variante="meta" color="acierto">
          {mensajesGrupo.alDia}
        </Texto>
      </View>
    );
  }
  return (
    <Texto variante="meta" color="textoTenue">
      {mensajesGrupo.leFaltan(faltan)}
    </Texto>
  );
}

function FilaMiembro({ fila, admin, faltan }: { fila: FilaRanking; admin: boolean; faltan: number | undefined }) {
  const { medidas } = useTema();
  const estado = faltan === undefined ? null : faltan === 0 ? mensajesGrupo.alDia : mensajesGrupo.leFaltan(faltan);

  return (
    <TablaFila
      resaltada={fila.es_yo}
      onPress={() => abrirPerfil(fila.usuario_id)}
      accessibilityLabel={[`${fila.posicion}.º`, fila.nombre, fila.es_yo && 'tú', admin && mensajesGrupo.admin, estado]
        .filter(Boolean)
        .join(', ')}
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
        {admin && (
          <Texto variante="meta" color="textoTenue">
            {mensajesGrupo.admin}
          </Texto>
        )}
      </View>
      {faltan !== undefined && <Estado faltan={faltan} />}
    </TablaFila>
  );
}

/**
 * Pestaña Miembros de S08 (F26 R16): por posición en el torneo, con "Admin" y cuántos partidos
 * abiertos le faltan a cada uno (decisión 2; nunca cuáles). Tocar una fila abre S13 (F19 R8).
 */
export function PestanaMiembros({ grupo }: { grupo: GrupoDetalle }) {
  const { espacio } = useTema();
  // La misma consulta y caché que la pestaña Ranking.
  const ranking = useQuery({
    queryKey: ['grupo', grupo.id, 'ranking', 'torneo', null],
    queryFn: () => obtenerRanking(grupo.id, null),
  });
  const roles = useQuery({ queryKey: ['grupo', grupo.id, 'roles'], queryFn: () => obtenerRoles(grupo.id) });
  const faltan = useQuery({ queryKey: ['grupo', grupo.id, 'faltan'], queryFn: () => obtenerFaltan(grupo.id) });

  const admins = new Set((roles.data ?? []).filter((r) => r.rol === 'ADMIN').map((r) => r.usuario_id));
  const conAbiertos = (faltan.data?.abiertos ?? 0) > 0;
  const jornada = faltan.data?.jornada ?? 'jornada actual';

  let filas: ReactNode;
  if (ranking.data !== undefined) {
    filas = (
      <View>
        {ranking.data.filas.map((fila) => (
          <FilaMiembro
            key={fila.usuario_id}
            fila={fila}
            admin={admins.has(fila.usuario_id)}
            faltan={conAbiertos ? (faltan.data?.porMiembro.get(fila.usuario_id) ?? 0) : undefined}
          />
        ))}
      </View>
    );
  } else if (ranking.isError) {
    const noMiembro = ranking.error instanceof ErrorGrupo && ranking.error.codigo === 'NO_MIEMBRO';
    filas = noMiembro ? (
      <EstadoPantalla mensaje={mensajesGrupo.noMiembro} accion={{ titulo: 'Ir a Grupos', onPress: () => router.navigate('/grupos') }} />
    ) : (
      <EstadoPantalla
        mensaje={esSinConexion(ranking.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorRanking}
        accion={{ titulo: 'Reintentar', onPress: () => void ranking.refetch() }}
      />
    );
  } else {
    filas = (
      <View testID="miembros-cargando" style={{ gap: espacio.s }}>
        <Esqueleto variante="cuerpoFuerte" ancho="90%" />
        <Esqueleto variante="cuerpoFuerte" ancho="85%" />
      </View>
    );
  }

  let resumen: ReactNode = null;
  if (faltan.data !== undefined) {
    resumen = (
      <Texto variante="meta" color="textoTenue">
        {conAbiertos ? mensajesGrupo.abiertos(faltan.data.abiertos, jornada) : mensajesGrupo.sinAbiertos(jornada)}
      </Texto>
    );
  } else if (faltan.isError) {
    resumen = (
      <View style={{ gap: espacio.xs }}>
        <Texto variante="meta" color="fallo">
          {mensajesGrupo.errorFaltan}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void faltan.refetch()} />
      </View>
    );
  }

  return (
    <View style={{ gap: espacio.l }}>
      <Seccion etiqueta="Miembros">
        {resumen}
        {filas}
      </Seccion>
      <InvitarYSalir grupo={grupo} />
    </View>
  );
}
