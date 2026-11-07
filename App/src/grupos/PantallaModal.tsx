import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EncabezadoPantalla, Texto } from '../componentes';
import { useTema } from '../tema';

/** Marco de S05 y S06: modales que tapan el menú (D76), con "← Volver" y título. */
export function PantallaModal({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { colores, espacio, medidas } = useTema();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.xl,
          gap: espacio.l,
        }}
      >
        <EncabezadoPantalla onVolver={router.canGoBack() ? () => router.back() : undefined} />
        <Texto variante="titulo1" accessibilityRole="header">
          {titulo}
        </Texto>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
