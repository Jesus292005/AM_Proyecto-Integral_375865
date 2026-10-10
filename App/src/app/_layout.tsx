import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { useOpcionesPila } from '../navegacion/opcionesPila';
import { temaNavegacion } from '../navegacion/temaNavegacion';
import { ProveedorTema, useFuentesApp, useTema } from '../tema';
import { temaGrafito } from '../tema/tokens';

SplashScreen.preventAutoHideAsync();
// Fondo nativo de la ventana: evita el destello claro detrás de las pantallas.
SystemUI.setBackgroundColorAsync(temaGrafito.colores.fondo);

function Pila() {
  const tema = useTema();
  const opciones = useOpcionesPila();

  // Pantallas con menú inferior: dentro de (tabs). Fuera, tapando el menú: inicio de sesión,
  // modales y cámara.
  return (
    <ThemeProvider value={temaNavegacion(tema)}>
      <Stack screenOptions={opciones}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="equipo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grupos/nuevo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grupos/unirse" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function LayoutRaiz() {
  const fuentesListas = useFuentesApp();

  useEffect(() => {
    if (fuentesListas) SplashScreen.hideAsync();
  }, [fuentesListas]);

  if (!fuentesListas) return null;

  return (
    <ProveedorTema>
      <StatusBar style="light" />
      <Pila />
    </ProveedorTema>
  );
}
