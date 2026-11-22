import { useEffect, useRef, useState } from 'react';
import { type LayoutRectangle, Pressable, ScrollView, View } from 'react-native';

import { Texto } from '../componentes';
import { useTema } from '../tema';
import type { JornadaDeLista } from './datos';

/**
 * Etiqueta corta de una jornada (F23 R1): "Jornada 7" → "J7"; "Liguilla · Semifinales" → "Semis";
 * las demás de liguilla, lo que va después de "·" ("Play-in", "Cuartos", "Final").
 */
export function etiquetaJornada(nombre: string): string {
  const regular = /^Jornada (\d+)$/.exec(nombre);
  if (regular) return `J${regular[1]}`;
  const fase = nombre.split('·').at(-1)?.trim() ?? nombre;
  return fase === 'Semifinales' ? 'Semis' : fase;
}

/** Desplaza la tira para que la celda quede al centro (o lo más cerca posible del inicio). */
function centrarCelda(
  vista: ScrollView | null,
  celda: LayoutRectangle,
  ancho: number,
  animado: boolean,
) {
  vista?.scrollTo({ x: Math.max(0, celda.x + celda.width / 2 - ancho / 2), animated: animado });
}

interface Props {
  jornadas: readonly JornadaDeLista[];
  elegida: number;
  /** `orden` de la jornada actual del servidor (D86); null si no hay. */
  actual: number | null;
  onElegir: (orden: number) => void;
}

/**
 * Fila deslizable con todas las jornadas (F23 R1–R3, 05-ui §5): la elegida en `superficie2` con
 * borde de acento y la actual con un punto de acento. Se centra sola en la elegida.
 */
export function TiraJornadas({ jornadas, elegida, actual, onElegir }: Props) {
  const { colores, espacio, medidas } = useTema();
  const vista = useRef<ScrollView>(null);
  const posiciones = useRef(new Map<number, LayoutRectangle>());
  const [anchoVista, setAnchoVista] = useState(0);
  // La primera vez se centra sin animación (al abrir S02); después, con animación.
  const centrada = useRef(false);

  function centrar(celda: LayoutRectangle | undefined, ancho: number) {
    if (celda === undefined || ancho === 0) return;
    centrarCelda(vista.current, celda, ancho, centrada.current);
    centrada.current = true;
  }

  // Al cambiar de jornada o al conocer el ancho de la vista, la elegida va al centro (R2). Solo
  // dependen de `elegida` y `anchoVista`: lo demás son refs.
  useEffect(() => {
    const celda = posiciones.current.get(elegida);
    if (celda === undefined || anchoVista === 0) return;
    centrarCelda(vista.current, celda, anchoVista, centrada.current);
    centrada.current = true;
  }, [elegida, anchoVista]);

  return (
    <ScrollView
      ref={vista}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      testID="tira-jornadas"
      onLayout={(e) => setAnchoVista(e.nativeEvent.layout.width)}
      contentContainerStyle={{ gap: espacio.xxs }}
    >
      {jornadas.map((jornada) => {
        const esElegida = jornada.orden === elegida;
        const esActual = jornada.orden === actual;
        return (
          <Pressable
            key={jornada.id}
            onPress={() => onElegir(jornada.orden)}
            onLayout={(e) => {
              posiciones.current.set(jornada.orden, e.nativeEvent.layout);
              if (esElegida && !centrada.current) centrar(e.nativeEvent.layout, anchoVista);
            }}
            accessibilityRole="tab"
            // U5: "actual" también va en texto para el lector de pantalla, no solo en el punto.
            accessibilityLabel={esActual ? `${jornada.nombre}, jornada actual` : jornada.nombre}
            accessibilityState={{ selected: esElegida }}
            testID={`jornada-${jornada.orden}`}
            style={({ pressed }) => ({
              minWidth: medidas.areaTactil,
              minHeight: medidas.areaTactil,
              paddingHorizontal: espacio.s,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: medidas.radio,
              borderWidth: medidas.linea,
              borderColor: esElegida ? colores.acento : 'transparent',
              backgroundColor: esElegida ? colores.superficie2 : undefined,
              opacity: pressed ? medidas.opacidadPresionado : 1,
            })}
          >
            <Texto variante="pestana" color={esElegida ? 'texto' : 'textoTenue'} numberOfLines={1}>
              {etiquetaJornada(jornada.nombre)}
            </Texto>
            <View
              testID={esActual ? 'jornada-actual' : undefined}
              style={{
                width: medidas.puntoJornada,
                height: medidas.puntoJornada,
                borderRadius: medidas.puntoJornada / 2,
                marginTop: espacio.xxs,
                backgroundColor: esActual ? colores.acento : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Mientras carga el torneo: 5 bloques con la forma de las celdas (F23 Estados). */
export function EsqueletoTira() {
  const { colores, espacio, medidas } = useTema();

  return (
    <View testID="tira-cargando" style={{ flexDirection: 'row', gap: espacio.xxs }}>
      {[0, 1, 2, 3, 4].map((bloque) => (
        <View
          key={bloque}
          style={{
            width: medidas.areaTactil,
            height: medidas.areaTactil,
            borderRadius: medidas.radio,
            backgroundColor: colores.superficie,
          }}
        />
      ))}
    </View>
  );
}
