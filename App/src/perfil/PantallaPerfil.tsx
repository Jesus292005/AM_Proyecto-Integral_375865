// S09 Perfil. Sin el enlace a Equipo favorito: F18 quedó fuera del plan (D88, D103).
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, Texto } from '../componentes';
import { BotonCerrarSesion } from '../sesion/BotonCerrarSesion';
import { useTema } from '../tema';
import { AjusteRecordatorios } from './AjusteRecordatorios';
import { SeccionRacha } from './SeccionRacha';
import { useMiRol } from './useMiRol';

export function PantallaPerfil() {
  const { colores, espacio, medidas } = useTema();
  const rol = useMiRol();

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
          Perfil
        </Texto>
        <SeccionRacha />
        <AjusteRecordatorios />
        {/* Solo administrador (F09 R1, D36); el servidor verifica el rol en cada operación. */}
        {rol.data === 'ADMIN' && (
          <Boton
            titulo="Simulación"
            variante="secundario"
            onPress={() => router.navigate('/admin/simulacion')}
          />
        )}
        <BotonCerrarSesion />
      </ScrollView>
    </SafeAreaView>
  );
}
