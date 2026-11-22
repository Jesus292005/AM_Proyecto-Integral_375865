import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../tema';
import { EncabezadoPantalla } from './EncabezadoPantalla';
import { Texto } from './Texto';

/** Marco de los modales que tapan el menú (D76): S05, S06, S12 y S14, con "← Volver" y título. */
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
