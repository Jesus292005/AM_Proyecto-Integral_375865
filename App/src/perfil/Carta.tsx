import { Pressable, View } from 'react-native';

import { DegradadoMetal, EscudoEquipo, FotoUsuario, Texto, type EquipoConEscudo } from '../componentes';
import { useTema } from '../tema';
import type { MiCarta, MiPerfil, Nivel } from './datos';
import { renglonesDeNombre } from './nombre';

export type CodigoAtributo = 'PRE' | 'PUN' | 'ANA' | 'CON';
/** Lo que se puede tocar en la carta para ver su detalle (F20 R8). */
export type ParteCarta = CodigoAtributo | 'MEDIA';

/** Abreviatura, nombre, qué mide y cómo se calcula cada atributo (F20 R1, R8). */
export const atributos: readonly {
  codigo: CodigoAtributo;
  nombre: string;
  explicacion: string;
  calculo: string;
  sinDato?: string;
  /** El mismo motivo en tercera persona, para el perfil de otro (F19 R3). */
  sinDatoDeOtro?: string;
  valor: (carta: MiCarta) => number | null;
}[] = [
  {
    codigo: 'PRE',
    nombre: 'Precisión',
    explicacion: 'Qué tan seguido sacas puntos: tus predicciones con puntos entre todas tus predicciones calificadas.',
    calculo: '40 + 59 × (predicciones con puntos ÷ predicciones calificadas)',
    valor: (c) => c.precision,
  },
  {
    codigo: 'PUN',
    nombre: 'Puntería',
    explicacion: 'Cuántos puntos sacas por predicción, comparado con lo máximo: un marcador exacto vale 350.',
    calculo: '40 + 59 × (puntos base promedio ÷ 350)',
    valor: (c) => c.punteria,
  },
  {
    codigo: 'ANA',
    nombre: 'Análisis',
    explicacion: 'Qué tan buenos son tus análisis: el bono promedio que te dio la IA, que va de 0 a 100.',
    calculo: '40 + 59 × (bono promedio ÷ 100)',
    sinDato: 'Aún no tienes análisis evaluados por la IA. Escribe por qué crees que pasará al predecir.',
    sinDatoDeOtro: 'Aún no tiene análisis evaluados por la IA.',
    valor: (c) => c.analisis,
  },
  {
    codigo: 'CON',
    nombre: 'Constancia',
    explicacion: 'Tu mejor racha de predicciones con puntos seguidas. Llega al máximo con 10.',
    calculo: '40 + 59 × (mejor racha, hasta 10, ÷ 10)',
    valor: (c) => c.constancia,
  },
];

export const textoNivel: Record<Nivel, string> = { BRONCE: 'Bronce', PLATA: 'Plata', ORO: 'Oro' };
const metalDe = { BRONCE: 'bronce', PLATA: 'plata', ORO: 'oro' } as const;

// F20 R3. El servidor decide la media y el nivel; este mínimo solo dice cuántas faltan.
export const MINIMO_CALIFICADAS = 5;

/** Con `deOtro`, en tercera persona (S13, F19 R3). */
export const textoFaltan = (n: number, deOtro = false) => {
  if (deOtro) return n === 1 ? 'Le falta 1 predicción calificada' : `Le faltan ${n} predicciones calificadas`;
  return n === 1 ? 'Te falta 1 predicción calificada' : `Te faltan ${n} predicciones calificadas`;
};

interface Props {
  carta: MiCarta;
  /** Mi perfil (S09) o el de otro (S13): solo nombre, foto y el escudo del favorito. */
  perfil: Pick<MiPerfil, 'nombre' | 'foto_url'> & { equipo: EquipoConEscudo | null };
  /** Parte tocada: su detalle se abre en una hoja (R8). */
  elegido: ParteCarta | null;
  onElegir: (parte: ParteCarta) => void;
  /** S13: la carta de otro, con los textos en tercera persona (F19 R3). */
  deOtro?: boolean;
}

/**
 * Carta de jugador (F20 R7, 05-ui U6): degradado del metal de su nivel, media y nivel en texto,
 * foto, nombre, escudo del favorito y los 4 atributos. Sin nivel (menos de 5 calificadas) sale
 * bloqueada, en `superficie2` y sin metal (R3).
 */
export function Carta({ carta, perfil, elegido, onElegir, deOtro = false }: Props) {
  const deQuien = deOtro ? `Carta de ${perfil.nombre}` : 'Tu carta';
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
        {/* La media es un botón que abre su detalle; los atributos son botones aparte. */}
        <Pressable
          testID="carta-media"
          onPress={() => onElegir('MEDIA')}
          accessibilityRole="button"
          accessibilityLabel={
            carta.media !== null && carta.nivel
              ? `${deQuien}: media ${carta.media}, nivel ${textoNivel[carta.nivel]}`
              : `${deQuien}, bloqueada: ${textoFaltan(faltan, deOtro)}`
          }
          accessibilityHint="Ver cómo se calcula"
          accessibilityState={{ selected: elegido === 'MEDIA' }}
          style={{ alignItems: 'center', minWidth: medidas.areaTactil, minHeight: medidas.areaTactil }}
        >
          <Texto variante="titulo1" color="textoTenue" colorDato={colorTexto}>
            {carta.media !== null ? String(carta.media) : '—'}
          </Texto>
          {/* U5: el nivel también en texto, no solo el metal. */}
          <Texto variante="etiqueta" color="textoTenue" colorDato={colorTexto}>
            {carta.nivel ? textoNivel[carta.nivel] : 'Sin nivel'}
          </Texto>
        </Pressable>
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
          {`${textoFaltan(faltan, deOtro)} para ${deOtro ? 'su' : 'tu'} carta.`}
        </Texto>
      )}
    </View>
  );
}
