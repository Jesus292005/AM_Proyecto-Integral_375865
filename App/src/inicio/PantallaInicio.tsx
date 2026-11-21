// S11 Inicio. F17 (3 bloques) quedó fuera del plan (D88); mientras tanto, accesos directos a lo
// principal en lugar de la pantalla provisional (D103).
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, Texto } from '../componentes';
import { useTema } from '../tema';

export function PantallaInicio() {
  const { colores, espacio, medidas } = useTema();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingTop: espacio.l,
          paddingBottom: espacio.xl,
          gap: espacio.l,
        }}
      >
        <Texto variante="titulo1" accessibilityRole="header">
          Inicio
        </Texto>
        <Texto variante="cuerpo" color="textoTenue">
          Predice los partidos de la jornada, justifica tu análisis y compite con tus grupos.
        </Texto>
        <View style={{ gap: espacio.s }}>
          <Boton titulo="Predecir partidos" onPress={() => router.navigate('/partidos')} />
          <Boton
            titulo="Ver mis grupos"
            variante="secundario"
            onPress={() => router.navigate('/grupos')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
