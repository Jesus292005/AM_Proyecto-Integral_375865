import { Pressable, View } from 'react-native';

import { DegradadoMetal, EscudoEquipo, FotoUsuario, Texto } from '../componentes';
import { useTema } from '../tema';
import type { MiCarta, MiPerfil, Nivel } from './datos';
import { renglonesDeNombre } from './nombre';

export type CodigoAtributo = 'PRE' | 'PUN' | 'ANA' | 'CON';

/** Abreviatura, nombre y cómo se calcula cada atributo (F20 R1, R8). */
export const atributos: readonly {
  codigo: CodigoAtributo;
  nombre: string;
  explicacion: string;
  valor: (carta: MiCarta) => number | null;
}[] = [
  {
    codigo: 'PRE',
    nombre: 'Precisión',
    explicacion: 'Tus predicciones con puntos entre todas tus predicciones calificadas.',
    valor: (c) => c.precision,
  },
  {
    codigo: 'PUN',
    nombre: 'Puntería',
    explicacion: 'Tus puntos base promedio por predicción, sobre 350 (un marcador exacto).',
    valor: (c) => c.punteria,
  },
  {
    codigo: 'ANA',
    nombre: 'Análisis',
    explicacion: 'El bono promedio que te dio la IA por tus análisis, sobre 100.',
    valor: (c) => c.analisis,
  },
  {
    codigo: 'CON',
    nombre: 'Constancia',
    explicacion: 'Tu mejor racha de predicciones con puntos, hasta 10.',
    valor: (c) => c.constancia,
  },
];

export const textoNivel: Record<Nivel, string> = { BRONCE: 'Bronce', PLATA: 'Plata', ORO: 'Oro' };
const metalDe = { BRONCE: 'bronce', PLATA: 'plata', ORO: 'oro' } as const;

// F20 R3. El servidor decide la media y el nivel; este mínimo solo dice cuántas faltan.
const MINIMO_CALIFICADAS = 5;

const textoFaltan = (n: number) =>
  n === 1 ? 'Te falta 1 predicción calificada' : `Te faltan ${n} predicciones calificadas`;

interface Props {
  carta: MiCarta;
  perfil: Pick<MiPerfil, 'nombre' | 'foto_url' | 'equipo'>;
  /** Atributo tocado (su explicación va debajo de la carta, R8). */
  elegido: CodigoAtributo | null;
  onElegir: (codigo: CodigoAtributo) => void;
}

/**
 * Carta de jugador (F20 R7, 05-ui U6): degradado del metal de su nivel, media y nivel en texto,
 * foto, nombre, escudo del favorito y los 4 atributos. Sin nivel (menos de 5 calificadas) sale
 * bloqueada, en `superficie2` y sin metal (R3).
 */
export function Carta({ carta, perfil, elegido, onElegir }: Props) {
  const { colores, metales, espacio, medidas } = useTema();
  const metal = carta.nivel ? metales[metalDe[carta.nivel]] : null;
  // Sobre el metal, el texto usa su color "texto encima" (05-ui §2).
  const colorTexto = metal?.texto;
  const faltan = Math.max(0, MINIMO_CALIFICADAS - carta.calificadas);

  return (
    <View
      testID={metal ? 'carta' : 'carta-bloqueada'}
      style={{
        borderRadius: medidas.radioModal,
        overflow: 'hidden',
        padding: espacio.m,
        gap: espacio.m,
        backgroundColor: metal ? undefined : colores.superficie2,
      }}
    >
      {metal && <DegradadoMetal metal={metal} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
        {/* Agrupado para el lector de pantalla; los atributos siguen siendo botones aparte. */}
        <View
          testID="carta-media"
          accessible
          accessibilityLabel={
            carta.media !== null && carta.nivel
              ? `Tu carta: media ${carta.media}, nivel ${textoNivel[carta.nivel]}`
              : `Tu carta, bloqueada: ${textoFaltan(faltan)}`
          }
          style={{ alignItems: 'center' }}
        >
          <Texto variante="titulo1" color="textoTenue" colorDato={colorTexto}>
            {carta.media !== null ? String(carta.media) : '—'}
          </Texto>
          {/* U5: el nivel también en texto, no solo el metal. */}
          <Texto variante="etiqueta" color="textoTenue" colorDato={colorTexto}>
            {carta.nivel ? textoNivel[carta.nivel] : 'Sin nivel'}
          </Texto>
        </View>
        <FotoUsuario url={perfil.foto_url} nombre={perfil.nombre} tamano="fotoPerfil" />
        <View style={{ flex: 1, gap: espacio.xxs }}>
          <Texto
            variante="titulo2"
            colorDato={colorTexto}
            numberOfLines={renglonesDeNombre(perfil.nombre)}
            adjustsFontSizeToFit
            testID="carta-nombre"
          >
            {perfil.nombre}
          </Texto>
          {perfil.equipo && <EscudoEquipo equipo={perfil.equipo} tamano="escudoLista" />}
        </View>
      </View>

      {metal ? (
        <View style={{ flexDirection: 'row' }}>
          {atributos.map(({ codigo, nombre, valor }) => {
            const numero = valor(carta);
            return (
              <Pressable
                key={codigo}
                onPress={() => onElegir(codigo)}
                accessibilityRole="button"
                accessibilityLabel={`${nombre}: ${numero ?? 'sin dato'}`}
                accessibilityState={{ selected: elegido === codigo }}
                style={{ flex: 1, alignItems: 'center', minHeight: medidas.areaTactil }}
              >
                <Texto variante="etiqueta" colorDato={colorTexto}>
                  {codigo}
                </Texto>
                <Texto variante="numero" colorDato={colorTexto}>
                  {numero !== null ? String(numero) : '—'}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Texto variante="cuerpo" color="texto2">
          {`${textoFaltan(faltan)} para tu carta.`}
        </Texto>
      )}
    </View>
  );
}
