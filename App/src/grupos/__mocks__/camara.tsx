// Activado para todas las pruebas en `jest.setup.ts`. Por defecto el permiso está concedido; las
// pruebas leen un QR con `simularLectura` y un fallo de la cámara con `simularErrorCamara`.
import { useEffect } from 'react';
import { View } from 'react-native';

import type { EstadoCamara } from '../camara';

export const pedirPermisoCamara = jest.fn();
export const abrirAjustesCamara = jest.fn();
export const usePermisoCamara = jest.fn(
  (): { estado: EstadoCamara; pedir: () => void; abrirAjustes: () => void } => ({
    estado: 'concedido',
    pedir: pedirPermisoCamara,
    abrirAjustes: abrirAjustesCamara,
  }),
);

type PropsLector = { onLeer: (contenido: string) => void; onError: () => void };
const enPantalla: { lector: PropsLector | null } = { lector: null };

export function LectorCamara(props: PropsLector) {
  useEffect(() => {
    enPantalla.lector = props;
    return () => {
      enPantalla.lector = null;
    };
  });
  return <View testID="lector-qr" />;
}

/** La cámara entrega `contenido` (como `onBarcodeScanned`). */
export function simularLectura(contenido: string) {
  if (enPantalla.lector === null) throw new Error('El lector de QR no está en pantalla');
  enPantalla.lector.onLeer(contenido);
}

export function simularErrorCamara() {
  if (enPantalla.lector === null) throw new Error('El lector de QR no está en pantalla');
  enPantalla.lector.onError();
}
