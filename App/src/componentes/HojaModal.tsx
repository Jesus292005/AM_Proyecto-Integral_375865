import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../tema';
import { Boton } from './Boton';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  /** La tarjeta lleva este `testID`; el fondo, el mismo con `-fuera`. */
  testID: string;
  children: ReactNode;
}

/**
 * Hoja modal sobre `velo` (05-ui §5): tarjeta `superficie` con radio 12 y "Cerrar" al final. Se
 * cierra con "Cerrar", tocando fuera o con "atrás" del sistema. La usan el detalle de una insignia
 * (F14 R6) y el de la media y los atributos de la carta (F20 R8).
 */
export function HojaModal({ visible, onCerrar, testID, children }: Props) {
  const { colores, espacio, medidas } = useTema();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: medidas.margenPantalla }}>
        {/* Tocar fuera cierra; es un elemento aparte para que tocar la tarjeta no la cierre. */}
        <Pressable
          testID={`${testID}-fuera`}
          onPress={onCerrar}
          accessible={false}
          style={[StyleSheet.absoluteFill, { backgroundColor: colores.velo }]}
        />
        {visible && (
          <View
            testID={testID}
            accessibilityViewIsModal
            style={{
              alignItems: 'center',
              gap: espacio.m,
              padding: espacio.l,
              borderRadius: medidas.radioModal,
              backgroundColor: colores.superficie,
            }}
          >
            {children}
            <View style={{ alignSelf: 'stretch' }}>
              <Boton titulo="Cerrar" variante="secundario" onPress={onCerrar} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
