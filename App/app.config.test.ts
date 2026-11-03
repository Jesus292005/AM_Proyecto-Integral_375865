import type { ConfigContext, ExpoConfig } from 'expo/config';

import configuracion, {
  ARCHIVO_SERVICIOS_GOOGLE,
  archivoServiciosGoogle,
  COLOR_NOTIFICACION,
} from './app.config';
import base from './app.json';
import { coloresGrafito } from './src/tema/tokens';

const contexto = (config: Partial<ExpoConfig>): ConfigContext => ({
  config,
  projectRoot: '.',
  staticConfigPath: null,
  packageJsonPath: null,
});

function opcionesPlugin(config: ExpoConfig, nombre: string): unknown {
  const plugin = config.plugins?.find((p) => Array.isArray(p) && p[0] === nombre);
  return Array.isArray(plugin) ? plugin[1] : undefined;
}

describe('archivoServiciosGoogle', () => {
  it('F11a R11: usa la variable de archivo de EAS cuando existe', () => {
    expect(archivoServiciosGoogle({ GOOGLE_SERVICES_JSON: '/eas/google.json' })).toBe('/eas/google.json');
  });

  it('F11a R11: sin variable usa el archivo local, que no se versiona', () => {
    expect(archivoServiciosGoogle({})).toBe(ARCHIVO_SERVICIOS_GOOGLE);
  });
});

describe('configuración de la app', () => {
  const config = configuracion(contexto(base.expo as Partial<ExpoConfig>));

  it('conserva app.json: paquete permanente (D64) y plugins existentes', () => {
    expect(config.android?.package).toBe('mx.campeondesillon.app');
    expect(config.plugins).toEqual(expect.arrayContaining(base.expo.plugins));
  });

  it('agrega el plugin de notificaciones con el color de acento de los tokens (05-ui §2)', () => {
    expect(COLOR_NOTIFICACION).toBe(coloresGrafito.acento);
    expect(opcionesPlugin(config, 'expo-notifications')).toEqual({
      icon: './assets/android-icon-monochrome.png',
      color: coloresGrafito.acento,
    });
  });

  it('la cámara no pide permiso de micrófono (solo lee códigos QR)', () => {
    expect(opcionesPlugin(config, 'expo-camera')).toMatchObject({ recordAudioAndroid: false });
  });

  it('falla con un mensaje claro si app.json no define nombre y slug', () => {
    expect(() => configuracion(contexto({}))).toThrow('app.json debe definir `name` y `slug`.');
  });
});
