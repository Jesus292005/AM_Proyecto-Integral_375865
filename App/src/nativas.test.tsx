import { render } from '@testing-library/react-native';
import { CameraView } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import QRCode from 'react-native-qrcode-svg';

// T31: las dependencias nativas de M2 (D88) cargan en jest con los simulacros de jest-expo, así las
// pruebas de F11a y F12 no necesitan simular cada módulo a mano.

describe('dependencias nativas en pruebas', () => {
  it('expo-notifications expone sus funciones sin el módulo nativo', () => {
    expect(typeof Notifications.getPermissionsAsync).toBe('function');
    expect(typeof Notifications.getExpoPushTokenAsync).toBe('function');
    expect(typeof Notifications.setNotificationChannelAsync).toBe('function');
  });

  it('expo-camera se renderiza', () => {
    expect(() => render(<CameraView testID="camara" />)).not.toThrow();
  });

  it('react-native-qrcode-svg se renderiza', () => {
    expect(() => render(<QRCode value="ABC123" />)).not.toThrow();
  });
});
