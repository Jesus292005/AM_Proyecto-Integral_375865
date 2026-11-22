import { View } from 'react-native';

import { Boton, Texto } from '../componentes';
import { formatearHora } from '../formato/fechas';
import { useTema } from '../tema';
import type { Prediccion } from './eleccion';
import { textoBoleta } from './presentacion';

interface Props {
  partido: { local: { nombre_corto: string }; visitante: { nombre_corto: string } };
  prediccion: Prediccion;
  /** Sin `onEditar` es la boleta cerrada, de solo lectura (F24 R5). */
  onEditar?: () => void;
}

const SIN_ANALISIS = 'Sin análisis';

/**
 * Boleta de mi predicción (F24 R1, 05-ui §5): tarjeta con lo elegido en grande, el análisis, la
 * hora en que se guardó y "Editar predicción" mientras siga abierta.
 */
export function BoletaPrediccion({ partido, prediccion, onEditar }: Props) {
  const { colores, espacio, medidas } = useTema();
  const hora = formatearHora(new Date(prediccion.actualizada_en));

  return (
    <View
      testID="boleta-prediccion"
      style={{
        gap: espacio.s,
        padding: espacio.m,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
      }}
    >
      <Texto variante="etiqueta" color="textoTenue">
        Tu predicción
      </Texto>
      <Texto variante="titulo2">{textoBoleta(partido, prediccion)}</Texto>
      <Texto variante="cuerpo" color={prediccion.justificacion === null ? 'textoTenue' : 'texto'}>
        {prediccion.justificacion ?? SIN_ANALISIS}
      </Texto>
      {/* Al guardar, el botón que tenía el foco desaparece: el lector de pantalla lo anuncia aquí. */}
      <Texto variante="meta" color="textoTenue" accessibilityLiveRegion="polite">
        {`Guardada · ${hora}`}
      </Texto>
      {onEditar && (
        <Boton titulo="Editar predicción" variante="secundario" icono="lapiz" onPress={onEditar} />
      )}
    </View>
  );
}
