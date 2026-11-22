import { View } from 'react-native';

import { Boton, Texto } from '../componentes';
import { aceptarRecordatorios } from '../notificaciones/registro';
import { guardarAhoraNo } from '../notificaciones/sistema';
import { useTema } from '../tema';

// F11a R1.
const PREGUNTA = '¿Te avisamos 1 h antes de que cierren los partidos que no has predicho?';

/** Explicación previa al permiso de notificaciones, después de guardar una predicción (F11a R1). */
export function PreguntaRecordatorios({ onCerrar }: { onCerrar: () => void }) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: espacio.s,
        padding: espacio.m,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
      }}
    >
      <Texto variante="cuerpo">{PREGUNTA}</Texto>
      <Boton
        titulo="Sí, avísame"
        onPress={() => {
          onCerrar();
          aceptarRecordatorios().catch((error: unknown) =>
            console.warn('[notificaciones] No se activaron los recordatorios', error),
          );
        }}
      />
      <Boton
        titulo="Ahora no"
        variante="secundario"
        onPress={() => {
          onCerrar();
          void guardarAhoraNo();
        }}
      />
    </View>
  );
}
