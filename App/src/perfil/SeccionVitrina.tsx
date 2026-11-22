import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { Boton, esNombreIcono, Insignia, Seccion, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { formatearDia } from '../formato/fechas';
import { useTema } from '../tema';
import { type InsigniaDeVitrina, marcarInsigniasVistas, obtenerMisInsignias } from './datos';
import { useReleerAlVolver } from './useReleerAlVolver';

const mensajes = {
  sinInsignias: 'Tu primera insignia llega con tu primer acierto.',
  error: 'No pudimos cargar tu Vitrina.',
  // Mismo texto que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
} as const;

const claveVitrina = ['mis-insignias'] as const;
const metalDe = { BRONCE: 'bronce', PLATA: 'plata', ORO: 'oro' } as const;

function etiquetaAccesible(insignia: InsigniaDeVitrina): string {
  if (insignia.veces === 0) return `${insignia.nombre}, bloqueada`;
  return insignia.veces > 1
    ? `${insignia.nombre}, ganada ${insignia.veces} veces`
    : `${insignia.nombre}, ganada`;
}

/** Qué dice debajo al tocar una (R6): cómo se gana y, si la tengo, cuándo la gané. */
function detalle(insignia: InsigniaDeVitrina): string {
  if (insignia.veces === 0 || insignia.ultima_en === null) return insignia.descripcion;
  const donde = [insignia.ultimo_grupo, insignia.ultima_jornada].filter(Boolean).join(' · ');
  const ultima = [
    `${insignia.veces > 1 ? 'La última vez' : 'La ganaste'}: ${formatearDia(new Date(insignia.ultima_en))}`,
    donde,
    insignia.ultima_simulada ? 'Simulada' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return `${insignia.descripcion} ${ultima}.`;
}

/** Una insignia de la rejilla; si es nueva, la animación celebratoria una sola vez (R7). */
function Casilla({
  insignia,
  elegida,
  onPress,
}: {
  insignia: InsigniaDeVitrina;
  elegida: boolean;
  onPress: () => void;
}) {
  const { colores, espacio, medidas } = useTema();
  const { nueva } = insignia;
  const [avance] = useState(() => new Animated.Value(nueva ? 0 : 1));

  // Al montar o cuando pasa a nueva (p. ej. al volver a la pestaña): la animación una vez. Al
  // marcarse vista deja de ser nueva y se queda como está.
  useEffect(() => {
    if (!nueva) return;
    avance.setValue(0);
    // 05-ui §8: escala de 0.8 a 1 con brillo, sin rebote.
    Animated.timing(avance, {
      toValue: 1,
      duration: medidas.celebracionMs,
      useNativeDriver: true,
    }).start();
  }, [nueva, avance, medidas.celebracionMs]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible(insignia)}
      accessibilityState={{ selected: elegida }}
      testID={nueva ? `insignia-nueva-${insignia.codigo}` : `insignia-${insignia.codigo}`}
      style={{
        width: '33.33%',
        minHeight: medidas.areaTactil,
        paddingVertical: espacio.xs,
        paddingHorizontal: espacio.xxs,
        borderRadius: medidas.radio,
        borderWidth: medidas.linea,
        borderColor: elegida ? colores.acento : 'transparent',
      }}
    >
      <Animated.View
        style={{
          opacity: avance.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          transform: [{ scale: avance.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }}
      >
        <Insignia
          nombre={insignia.nombre}
          metal={metalDe[insignia.nivel]}
          // R2: un ícono que la app no conoce se dibuja como trofeo.
          icono={esNombreIcono(insignia.icono) ? insignia.icono : 'trofeo'}
          bloqueada={insignia.veces === 0}
          veces={insignia.veces}
        />
      </Animated.View>
    </Pressable>
  );
}

function EsqueletoVitrina() {
  const { colores, espacio, medidas } = useTema();

  return (
    <View testID="vitrina-cargando" style={{ flexDirection: 'row', gap: espacio.l }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: medidas.medallaInsignia,
            height: medidas.medallaInsignia,
            borderRadius: medidas.medallaInsignia / 2,
            backgroundColor: colores.superficie,
          }}
        />
      ))}
    </View>
  );
}

/** S09, sección "Vitrina" (F14 R6–R7); un error no rompe el resto del perfil. */
export function SeccionVitrina() {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const vitrina = useQuery({ queryKey: claveVitrina, queryFn: obtenerMisInsignias });
  const [elegida, setElegida] = useState<string | null>(null);
  useReleerAlVolver(vitrina.refetch);

  // R7: las nuevas se marcan vistas una vez que ya se pintaron (y se animaron).
  const marcar = useMutation({
    mutationFn: marcarInsigniasVistas,
    onSuccess: () => void clienteConsultas.invalidateQueries({ queryKey: claveVitrina }),
  });
  const hayNuevas = vitrina.data?.some((i) => i.nueva) ?? false;
  const { mutate: marcarVistas } = marcar;
  // Una sola llamada por tanda de nuevas (mientras vuelve a llegar la Vitrina siguen "nuevas").
  const marcadas = useRef(false);
  useEffect(() => {
    if (!hayNuevas) {
      marcadas.current = false;
      return;
    }
    if (marcadas.current) return;
    marcadas.current = true;
    marcarVistas(undefined, {
      onError: () => {
        marcadas.current = false;
      },
    });
  }, [hayNuevas, marcarVistas]);

  let contenido;
  if (vitrina.data !== undefined) {
    const sinNinguna = vitrina.data.every((i) => i.veces === 0);
    const tocada = vitrina.data.find((i) => i.codigo === elegida);
    contenido = (
      <View style={{ gap: espacio.s }}>
        {sinNinguna && <Texto variante="cuerpo">{mensajes.sinInsignias}</Texto>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {vitrina.data.map((insignia) => (
            <Casilla
              key={insignia.codigo}
              insignia={insignia}
              elegida={insignia.codigo === elegida}
              onPress={() => setElegida((antes) => (antes === insignia.codigo ? null : insignia.codigo))}
            />
          ))}
        </View>
        {tocada && (
          <Texto variante="cuerpo" accessibilityLiveRegion="polite">
            {`${tocada.nombre}: ${detalle(tocada)}`}
          </Texto>
        )}
      </View>
    );
  } else if (vitrina.isError) {
    contenido = (
      <View style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(vitrina.error) ? mensajes.sinConexion : mensajes.error}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void vitrina.refetch()} />
      </View>
    );
  } else {
    contenido = <EsqueletoVitrina />;
  }

  return <Seccion etiqueta="Vitrina">{contenido}</Seccion>;
}
