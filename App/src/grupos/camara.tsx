import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';

// Lo que F12 necesita del teléfono: permiso de cámara y lector de QR de `expo-camera` (D51), que
// funciona en Android y en iOS (R9, D53). Es el único archivo que lo usa: las pruebas lo simulan
// con `__mocks__/camara` (activado para todas en `jest.setup.ts`).

export type EstadoCamara = 'revisando' | 'concedido' | 'negado' | 'bloqueado';

/**
 * F12 R6 (v1.2): cada vez que se entra a S07 sin permiso, se pide (Android lo pierde solo con
 * "Solo esta vez", y tras "Preguntar siempre" en Ajustes Expo lo reporta como negado). Al volver de
 * Ajustes se pide otra vez: si el sistema ya no deja preguntar, responde sin mostrar nada. Al
 * volver a la app por cualquier otra razón solo se revisa, para no repetir el diálogo en bucle (el
 * propio diálogo saca a la app de primer plano).
 */
export function usePermisoCamara(): {
  estado: EstadoCamara;
  pedir: () => void;
  abrirAjustes: () => void;
} {
  const [permiso, pedir, leer] = useCameraPermissions();
  const pedidoAlEntrar = useRef(false);
  const fueAAjustes = useRef(false);

  useEffect(() => {
    if (permiso === null || permiso.granted || pedidoAlEntrar.current) return;
    pedidoAlEntrar.current = true;
    void pedir();
  }, [permiso, pedir]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      if (fueAAjustes.current) {
        fueAAjustes.current = false;
        void pedir();
      } else {
        void leer();
      }
    });
    return () => suscripcion.remove();
  }, [pedir, leer]);

  let estado: EstadoCamara;
  if (permiso === null || permiso.status === 'undetermined') estado = 'revisando';
  else if (permiso.granted) estado = 'concedido';
  else estado = permiso.canAskAgain ? 'negado' : 'bloqueado';

  return {
    estado,
    pedir: () => void pedir(),
    abrirAjustes: () => {
      fueAAjustes.current = true;
      void Linking.openSettings();
    },
  };
}

interface PropsLector {
  /** Contenido de cada QR leído (la cámara lo entrega varias veces seguidas). */
  onLeer: (contenido: string) => void;
  /** La vista previa no pudo iniciar. */
  onError: () => void;
}

/** Cámara trasera a pantalla completa que solo lee QR (F12 R3). */
export function LectorCamara({ onLeer, onError }: PropsLector) {
  return (
    <CameraView
      style={{ flex: 1 }}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => onLeer(data)}
      onMountError={onError}
    />
  );
}
