import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { Boton, Esqueleto, Interruptor, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { aceptarRecordatorios } from '../notificaciones/registro';
import { abrirAjustes, leerPermiso } from '../notificaciones/sistema';
import { useTema } from '../tema';
import { guardarRecordatoriosActivos, obtenerRecordatoriosActivos } from './datos';

const mensajes = {
  explicacion: 'Te avisamos 1 h antes del cierre de los partidos que no has predicho.',
  permisoNegado: 'Las notificaciones están desactivadas para la app.',
  sinPermiso: 'Para recibirlos, permite las notificaciones.',
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  errorGuardar: 'No se pudo guardar.',
  errorCargar: 'No pudimos cargar tus recordatorios.',
} as const;

const claveActivos = ['recordatorios-activos'] as const;

/** Ajuste "Recordatorios" de S09 (F11a R4) con el estado del permiso del sistema. */
export function AjusteRecordatorios() {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const [falla, setFalla] = useState(false);

  const permiso = useQuery({ queryKey: ['permiso-notificaciones'], queryFn: leerPermiso });
  const activos = useQuery({ queryKey: claveActivos, queryFn: obtenerRecordatoriosActivos });
  const { refetch: releerPermiso } = permiso;

  // Al volver de los ajustes del sistema, el permiso pudo cambiar.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void releerPermiso();
    });
    return () => suscripcion.remove();
  }, [releerPermiso]);

  const guardar = useMutation({
    mutationFn: (activos: boolean) => guardarRecordatoriosActivos(activos),
    onMutate: (valor) => {
      setFalla(false);
      clienteConsultas.setQueryData(claveActivos, valor);
    },
    // El ajuste vuelve a su valor (Estados de pantalla).
    onError: (_error, valor) => {
      clienteConsultas.setQueryData(claveActivos, !valor);
      setFalla(true);
    },
  });

  async function activarNotificaciones() {
    await aceptarRecordatorios().catch((error: unknown) =>
      console.warn('[notificaciones] No se activaron los recordatorios', error),
    );
    void releerPermiso();
  }

  async function cambiar(valor: boolean) {
    // R1: también se pide desde aquí, si el sistema nunca preguntó.
    if (valor && permiso.data === 'sinPreguntar') await activarNotificaciones();
    guardar.mutate(valor);
  }

  if (activos.isPending || permiso.isPending) {
    return <Esqueleto variante="cuerpoFuerte" ancho="100%" />;
  }
  if (activos.isError) {
    return (
      <View style={{ gap: espacio.xs }}>
        <Texto variante="meta">
          {esSinConexion(activos.error) ? mensajes.sinConexion : mensajes.errorCargar}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void activos.refetch()} />
      </View>
    );
  }

  const negado = permiso.data === 'negado';
  // Encendido de fábrica pero sin permiso del sistema: no llegaría nada, así que se ofrece pedirlo.
  const faltaPermiso = permiso.data === 'sinPreguntar' && activos.data;


  return (
    <View style={{ gap: espacio.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoFuerte">Recordatorios</Texto>
          <Texto variante="meta" color="textoTenue">
            {mensajes.explicacion}
          </Texto>
        </View>
        <Interruptor
          valor={activos.data}
          onCambiar={(valor) => void cambiar(valor)}
          etiqueta="Recordatorios"
          deshabilitado={negado || guardar.isPending}
        />
      </View>
      {falla && (
        <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
          {mensajes.errorGuardar}
        </Texto>
      )}
      {faltaPermiso && (
        <>
          <Texto variante="meta" color="texto2">
            {mensajes.sinPermiso}
          </Texto>
          <Boton
            titulo="Activar notificaciones"
            variante="secundario"
            onPress={() => void activarNotificaciones()}
          />
        </>
      )}
      {negado && (
        <>
          <Texto variante="meta" color="texto2">
            {mensajes.permisoNegado}
          </Texto>
          <Boton titulo="Abrir ajustes" variante="secundario" onPress={() => void abrirAjustes()} />
        </>
      )}
    </View>
  );
}
