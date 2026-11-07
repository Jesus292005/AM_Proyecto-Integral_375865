import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { esquemaCodigoInvitacion } from './codigo';
import { unirseAGrupo } from './datos';
import { mensajeAlUnirse, mensajesGrupo } from './errores';

/**
 * Abre S08 en la pestaña Grupos (R11). Desde un modal (S05, S06), `navigate` cierra el modal
 * porque la pantalla de pestañas ya está en la pila (D78).
 */
export function irAlGrupo(grupoId: number, aviso?: 'ya-miembro') {
  router.navigate({
    pathname: '/(protegidas)/(tabs)/(grupos)/grupo/[grupoId]',
    params: aviso === undefined ? { grupoId: String(grupoId) } : { grupoId: String(grupoId), aviso },
  });
}

/**
 * Unirse con un código (F07 R4): valida el formato sin llamar al servidor (CA9), se une y abre el
 * grupo. Lo usan S06 con el código escrito y, en F12, con el código leído del QR.
 */
export function useUnirseAGrupo() {
  const clienteConsultas = useQueryClient();
  const [malEscrito, setMalEscrito] = useState(false);
  const union = useMutation({
    mutationFn: (codigo: string) => unirseAGrupo(codigo),
    onSuccess: ({ grupoId, yaEraMiembro }) => {
      void clienteConsultas.invalidateQueries({ queryKey: ['mis-grupos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['grupo', grupoId] });
      // R04: con compañeros nuevos cambian las predicciones visibles en S03.
      void clienteConsultas.invalidateQueries({ queryKey: ['predicciones-grupo'] });
      irAlGrupo(grupoId, yaEraMiembro ? 'ya-miembro' : undefined);
    },
  });

  function unirse(texto: string) {
    if (union.isPending) return;
    const codigo = esquemaCodigoInvitacion.safeParse(texto);
    if (!codigo.success) {
      union.reset();
      setMalEscrito(true);
      return;
    }
    setMalEscrito(false);
    union.mutate(codigo.data);
  }

  function limpiarError() {
    setMalEscrito(false);
    if (union.isError) union.reset();
  }

  let error: string | undefined;
  if (malEscrito) error = mensajesGrupo.codigoMalEscrito;
  else if (union.error) error = mensajeAlUnirse(union.error);

  return { unirse, uniendo: union.isPending, error, limpiarError };
}
