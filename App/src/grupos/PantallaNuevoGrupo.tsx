import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Boton, CampoTexto, Texto } from '../componentes';
import { crearGrupo } from './datos';
import { mensajeAlCrear, mensajesGrupo } from './errores';
import { PantallaModal } from './PantallaModal';
import { irAlGrupo } from './useUnirseAGrupo';

// F07 R1: de 3 a 30 caracteres después de recortar; el servidor vuelve a validar.
const MAXIMO = 30;
const MINIMO = 3;

/** S05: crear un grupo; al crearlo se abre en la pestaña Grupos (R11). */
export function PantallaNuevoGrupo() {
  const clienteConsultas = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [invalido, setInvalido] = useState(false);
  const creacion = useMutation({
    mutationFn: (texto: string) => crearGrupo(texto),
    onSuccess: (grupoId) => {
      void clienteConsultas.invalidateQueries({ queryKey: ['mis-grupos'] });
      irAlGrupo(grupoId);
    },
  });

  function crear() {
    const limpio = nombre.trim();
    if (limpio.length < MINIMO || limpio.length > MAXIMO) {
      creacion.reset();
      setInvalido(true);
      return;
    }
    setInvalido(false);
    creacion.mutate(limpio);
  }

  function cambiar(valor: string) {
    setNombre(valor);
    setInvalido(false);
    if (creacion.isError) creacion.reset();
  }

  let error: string | undefined;
  if (invalido) error = mensajesGrupo.nombreInvalido;
  else if (creacion.error) error = mensajeAlCrear(creacion.error);

  return (
    <PantallaModal titulo="Crear grupo">
      <Texto variante="cuerpo" color="texto2">
        Después invitas a tus amigos con el código del grupo.
      </Texto>
      <CampoTexto
        valor={nombre}
        onCambiar={cambiar}
        etiqueta="Nombre del grupo"
        placeholder="Nombre del grupo"
        maximo={MAXIMO}
        deshabilitado={creacion.isPending}
        error={error}
      />
      <Boton
        titulo="Crear grupo"
        onPress={crear}
        deshabilitado={nombre.trim() === ''}
        cargando={creacion.isPending}
      />
    </PantallaModal>
  );
}
