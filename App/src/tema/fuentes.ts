// Solo los grosores de 05-ui §3 (D52: cada grosor suma tamaño). Se importan por subruta
// porque el índice de cada paquete metería todos los grosores en la app.
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { Teko_500Medium } from '@expo-google-fonts/teko/500Medium';
import { Teko_600SemiBold } from '@expo-google-fonts/teko/600SemiBold';
import { Teko_700Bold } from '@expo-google-fonts/teko/700Bold';
import { useFonts } from 'expo-font';

import { familias } from './tokens';

const fuentes = {
  [familias.teko500]: Teko_500Medium,
  [familias.teko600]: Teko_600SemiBold,
  [familias.teko700]: Teko_700Bold,
  [familias.archivo400]: Archivo_400Regular,
  [familias.archivo600]: Archivo_600SemiBold,
  [familias.archivo800]: Archivo_800ExtraBold,
};

/** `true` cuando las fuentes terminaron de cargar; si fallan, la app sigue con la fuente del sistema. */
export function useFuentesApp(): boolean {
  const [cargadas, error] = useFonts(fuentes);
  return cargadas || error !== null;
}
