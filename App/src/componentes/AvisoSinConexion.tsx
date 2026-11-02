import { View } from 'react-native';

import { formatearHora } from '../formato/fechas';
import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props {
  /** Cuándo se cargaron los datos que se están mostrando. */
  actualizadoEn: Date;
  /** `false`: falló por otra causa (el servidor respondió con error). */
  sinConexion: boolean;
}

/** Franja superior cuando no se pudo actualizar y se muestran datos guardados (05-ui §6). */
export function AvisoSinConexion({ actualizadoEn, sinConexion }: Props) {
  const { colores, espacio, medidas } = useTema();
  const motivo = sinConexion ? 'Sin conexión' : 'No se pudo actualizar';

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colores.superficie2,
        borderRadius: medidas.radio,
        paddingVertical: espacio.xs,
        paddingHorizontal: espacio.s,
      }}
    >
      <Texto variante="meta" color="texto2">
        {`${motivo} · datos de ${formatearHora(actualizadoEn)}`}
      </Texto>
    </View>
  );
}
