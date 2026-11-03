import type { ConfigContext, ExpoConfig } from 'expo/config';

// Configuración dinámica sobre app.json. Solo agrega lo que no puede ser estático:
// - `google-services.json` (FCM, F11a R11) no se versiona: en EAS llega como variable de archivo
//   `GOOGLE_SERVICES_JSON`; en local se usa `./google-services.json` (sin él, la compilación local
//   falla con un mensaje claro en lugar de generar una app sin notificaciones).
// - Los plugins de las dependencias nativas de M2 (D88): notificaciones con el color de los tokens
//   y cámara sin permiso de micrófono (solo lee códigos QR, F12).

// = `acento` de los tokens (05-ui §2). El cargador de la configuración no importa archivos TS de la
// app; `app.config.test.ts` comprueba que coinciden.
export const COLOR_NOTIFICACION = '#FF6A2B';

export const ARCHIVO_SERVICIOS_GOOGLE = './google-services.json';

export function archivoServiciosGoogle(entorno: Record<string, string | undefined>): string {
  return entorno.GOOGLE_SERVICES_JSON ?? ARCHIVO_SERVICIOS_GOOGLE;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const { name, slug } = config;
  if (!name || !slug) throw new Error('app.json debe definir `name` y `slug`.');

  return {
    ...config,
    name,
    slug,
    android: {
      ...config.android,
      googleServicesFile: archivoServiciosGoogle(process.env),
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: COLOR_NOTIFICACION,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Para escanear el código QR de un grupo.',
          recordAudioAndroid: false,
        },
      ],
    ],
  };
};
