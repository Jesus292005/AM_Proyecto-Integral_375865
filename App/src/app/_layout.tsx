import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { useOpcionesPila } from '../navegacion/opcionesPila';
import { temaNavegacion } from '../navegacion/temaNavegacion';
import { ProveedorSesion, useSesion } from '../sesion/ProveedorSesion';
import { ProveedorTema, useFuentesApp, useTema } from '../tema';
import { temaGrafito } from '../tema/tokens';

SplashScreen.preventAutoHideAsync();
// Fondo nativo de la ventana: evita el destello claro detrás de las pantallas.
SystemUI.setBackgroundColorAsync(temaGrafito.colores.fondo);

function Pila() {
  const tema = useTema();
  const opciones = useOpcionesPila();

  // Las pantallas que requieren sesión están en (protegidas), que aplica la guardia (V6).
  return (
    <ThemeProvider value={temaNavegacion(tema)}>
      <Stack screenOptions={opciones}>
        <Stack.Screen name="(protegidas)" />
        <Stack.Screen name="login" />
      </Stack>
    </ThemeProvider>
  );
}

function Contenido() {
  const fuentesListas = useFuentesApp();
  const { estado } = useSesion();
  // La pantalla de carga sigue hasta saber si hay sesión: con sesión no se ve S01 (F01 §6.1).
  const listo = fuentesListas && estado.tipo !== 'cargando';

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!fuentesListas) return null;

  return (
    <>
      <StatusBar style="light" />
      <Pila />
    </>
  );
}

export default function LayoutRaiz() {
  return (
    <ProveedorTema>
      <ProveedorSesion>
        <Contenido />
      </ProveedorSesion>
    </ProveedorTema>
  );
}
