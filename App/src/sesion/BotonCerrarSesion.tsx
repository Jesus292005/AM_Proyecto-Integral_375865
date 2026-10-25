import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { Boton, Texto } from '../componentes';
import { useTema } from '../tema';
import { useSesion } from './ProveedorSesion';

type EstadoCierre = 'inicial' | 'cargando' | 'sinConexion' | 'error';

const mensajes = {
  // F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  error: 'No pudimos cerrar sesión. Inténtalo de nuevo.',
} as const;

/**
 * "Cerrar sesión" de S09 (F01 §7): confirma con el aviso nativo y, al cerrar, la guardia lleva a
 * S01. Si no se pudo cerrar, el usuario sigue dentro y ve el mensaje; el mismo botón reintenta.
 */
export function BotonCerrarSesion() {
  const { espacio } = useTema();
  const { cerrarSesion } = useSesion();
  const [estado, setEstado] = useState<EstadoCierre>('inicial');
  // Evita un segundo cierre si llegan dos confirmaciones antes de que el botón se deshabilite.
  const enCurso = useRef(false);

  async function cerrar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setEstado('cargando');
    const resultado = await cerrarSesion();
    enCurso.current = false;
    // Con éxito la pantalla se desmonta y se va a S01.
    if (resultado.tipo !== 'exito') setEstado(resultado.tipo);
  }

  function confirmar() {
    Alert.alert(
      '¿Cerrar sesión?',
      undefined,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => void cerrar() },
      ],
      { cancelable: true },
    );
  }

  return (
    <View style={{ gap: espacio.m }}>
      {(estado === 'sinConexion' || estado === 'error') && (
        <Texto variante="cuerpo" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {mensajes[estado]}
        </Texto>
      )}
      <Boton
        titulo="Cerrar sesión"
        variante="secundario"
        onPress={confirmar}
        cargando={estado === 'cargando'}
      />
    </View>
  );
}
