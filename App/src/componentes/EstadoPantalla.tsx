import { View } from 'react-native';

import { useTema } from '../tema';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface Props {
  mensaje: string;
  /** Acción principal si existe (vacío) o "Reintentar" (error), 05-ui §6. */
  accion?: { titulo: string; onPress: () => void };
}

/** Estado vacío o de error: texto centrado + acción opcional (05-ui §6). */
export function EstadoPantalla({ mensaje, accion }: Props) {
  const { espacio } = useTema();

  return (
    <View style={{ paddingVertical: espacio.xxxl, gap: espacio.l }}>
      <Texto variante="cuerpo" alineacion="center" accessibilityLiveRegion="polite">
        {mensaje}
      </Texto>
      {accion && <Boton titulo={accion.titulo} variante="secundario" onPress={accion.onPress} />}
    </View>
  );
}
