import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { Boton, CampoTexto, Esqueleto, EstadoPantalla, PantallaModal, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { cambiarMiNombre, ErrorNombreInvalido, type MiPerfil } from './datos';
import { esNombreValido, NOMBRE_MAXIMO, normalizarNombre } from './nombre';
import { claveMiPerfil, useMiPerfil } from './useMiPerfil';

const mensajes = {
  explicacion: 'Es el nombre que ven los demás en tus grupos. Ya no cambia cuando entras con Google.',
  // F28 R4.
  invalido: 'Usa de 3 a 20 letras o números.',
  // Mismos textos que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  errorGuardar: 'No se pudo guardar. Inténtalo de nuevo.',
  errorCargar: 'No pudimos cargar tu perfil. Inténtalo de nuevo.',
} as const;

function cerrar() {
  if (router.canGoBack()) router.back();
  else router.navigate('/perfil');
}

function Formulario({ actual }: { actual: string }) {
  const clienteConsultas = useQueryClient();
  const [nombre, setNombre] = useState(actual);
  const guardar = useMutation({
    mutationFn: (nuevo: string) => cambiarMiNombre(nuevo),
    onSuccess: (guardado) => {
      clienteConsultas.setQueryData<MiPerfil>(claveMiPerfil, (antes) => antes && { ...antes, nombre: guardado });
      void clienteConsultas.invalidateQueries({ queryKey: claveMiPerfil });
      cerrar();
    },
  });

  const limpio = normalizarNombre(nombre);
  const valido = esNombreValido(nombre);

  let error: string | undefined;
  if (guardar.error instanceof ErrorNombreInvalido) error = mensajes.invalido;
  else if (guardar.error) error = esSinConexion(guardar.error) ? mensajes.sinConexion : mensajes.errorGuardar;
  else if (limpio !== '' && !valido) error = mensajes.invalido;

  return (
    <>
      <CampoTexto
        valor={nombre}
        onCambiar={(valor) => {
          setNombre(valor);
          if (guardar.isError) guardar.reset();
        }}
        etiqueta="Tu nombre"
        placeholder="Tu nombre"
        maximo={NOMBRE_MAXIMO}
        deshabilitado={guardar.isPending}
        error={error}
      />
      <Boton
        titulo="Guardar"
        onPress={() => guardar.mutate(limpio)}
        deshabilitado={!valido || limpio === actual}
        cargando={guardar.isPending}
      />
    </>
  );
}

/** S14: cambiar el nombre visible (F28 R3–R4, decisión 1 de D108). */
export function PantallaCambiarNombre() {
  const perfil = useMiPerfil();

  let contenido;
  if (perfil.data !== undefined) contenido = <Formulario actual={perfil.data.nombre} />;
  else if (perfil.isError) {
    contenido = (
      <EstadoPantalla
        mensaje={esSinConexion(perfil.error) ? mensajes.sinConexion : mensajes.errorCargar}
        accion={{ titulo: 'Reintentar', onPress: () => void perfil.refetch() }}
      />
    );
  } else contenido = <Esqueleto variante="cuerpo" ancho="100%" />;

  return (
    <PantallaModal titulo="Cambiar nombre">
      <Texto variante="cuerpo" color="texto2">
        {mensajes.explicacion}
      </Texto>
      {contenido}
    </PantallaModal>
  );
}
