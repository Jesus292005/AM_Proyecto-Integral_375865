import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { useOpcionesPila } from '../../navegacion/opcionesPila';
import { useRutaActual } from '../../sesion/rutaActual';
import { useSesion } from '../../sesion/ProveedorSesion';

// Guardia de sesión (V6): todo lo que está en este grupo requiere sesión. Sin sesión se guarda la
// ruta pedida y se va a S01 (CA8, F01 §6.2); las pantallas protegidas nunca se dibujan sin sesión.
// Al cerrar sesión a propósito no se guarda la ruta: el siguiente inicio va a Inicio (F01 §7).
function IrAInicioSesion({ guardarRuta }: { guardarRuta: boolean }) {
  // La ruta de cuando se perdió la sesión; al redirigir, la ruta actual pasa a ser /login.
  const [ruta] = useState(useRutaActual());
  const { guardarDestino } = useSesion();

  useEffect(() => {
    if (guardarRuta) guardarDestino(ruta);
  }, [guardarRuta, ruta, guardarDestino]);

  return <Redirect href="/login" />;
}

export default function LayoutProtegidas() {
  const { estado } = useSesion();
  const opciones = useOpcionesPila();

  // Mientras se lee la sesión guardada sigue visible la pantalla de carga.
  if (estado.tipo === 'cargando') return null;
  if (estado.tipo === 'sinSesion') {
    return <IrAInicioSesion guardarRuta={estado.motivo !== 'cerrada'} />;
  }

  // Con menú inferior: dentro de (tabs). Fuera, tapando el menú: modales y cámara.
  return (
    <Stack screenOptions={opciones}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="equipo" options={{ presentation: 'modal' }} />
      <Stack.Screen name="grupos/nuevo" options={{ presentation: 'modal' }} />
      <Stack.Screen name="grupos/unirse" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
