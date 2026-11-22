import { View } from 'react-native';

import { DegradadoMetal, HojaModal, Texto } from '../componentes';
import { useTema } from '../tema';
import { atributos, MINIMO_CALIFICADAS, type ParteCarta, textoFaltan, textoNivel } from './Carta';
import type { MiCarta, Nivel } from './datos';

const metalDe = { BRONCE: 'bronce', PLATA: 'plata', ORO: 'oro' } as const;

// F20 R2: rangos de cada nivel, para explicar la media.
const niveles: readonly { nivel: Nivel; rango: string }[] = [
  { nivel: 'BRONCE', rango: 'menos de 65' },
  { nivel: 'PLATA', rango: 'de 65 a 79' },
  { nivel: 'ORO', rango: '80 o más' },
];

/** Bloque "etiqueta + texto" de la hoja. */
function Bloque({ etiqueta, children }: { etiqueta: string; children: string }) {
  const { espacio } = useTema();
  return (
    <View style={{ alignSelf: 'stretch', gap: espacio.xxs }}>
      <Texto variante="etiqueta" color="textoTenue">
        {etiqueta}
      </Texto>
      <Texto variante="cuerpo">{children}</Texto>
    </View>
  );
}

/** Número grande en una pastilla con el metal de la carta (o neutra si está bloqueada). */
function Valor({ valor, nivel }: { valor: number | null; nivel: Nivel | null }) {
  const { colores, metales, espacio, medidas } = useTema();
  const metal = nivel ? metales[metalDe[nivel]] : null;

  return (
    <View
      testID="detalle-carta-valor"
      style={{
        minWidth: medidas.medallaDetalle,
        paddingHorizontal: espacio.l,
        paddingVertical: espacio.xs,
        alignItems: 'center',
        borderRadius: medidas.radioModal,
        overflow: 'hidden',
        backgroundColor: metal ? undefined : colores.superficie2,
      }}
    >
      {metal && <DegradadoMetal metal={metal} />}
      <Texto variante="titulo1" color="textoTenue" colorDato={metal?.texto}>
        {valor !== null ? String(valor) : '—'}
      </Texto>
    </View>
  );
}

/**
 * Detalle de la media o de un atributo de la carta en una hoja (F20 R8, a pedido de Jesús en el
 * guion de M6): valor grande, qué mide, cómo se calcula y, para la media, los niveles.
 */
export function DetalleCarta({
  carta,
  parte,
  onCerrar,
}: {
  carta: MiCarta;
  parte: ParteCarta | null;
  onCerrar: () => void;
}) {
  const { espacio } = useTema();
  const atributo = atributos.find((a) => a.codigo === parte);

  let contenido = null;
  if (parte === 'MEDIA') {
    const faltan = Math.max(0, MINIMO_CALIFICADAS - carta.calificadas);
    contenido = (
      <>
        <Valor valor={carta.media} nivel={carta.nivel} />
        <View style={{ alignItems: 'center', gap: espacio.xxs }}>
          <Texto variante="titulo2" alineacion="center" accessibilityRole="header">
            Media
          </Texto>
          <Texto variante="etiqueta" color="textoTenue">
            {carta.nivel ? `Nivel ${textoNivel[carta.nivel]}` : 'Sin nivel'}
          </Texto>
        </View>
        <Bloque etiqueta="Qué es">
          El promedio de tus cuatro atributos. Análisis solo cuenta si ya tienes análisis evaluados por
          la IA.
        </Bloque>
        <Bloque etiqueta="Niveles">
          {niveles.map(({ nivel, rango }) => `${textoNivel[nivel]}: ${rango}`).join(' · ')}
        </Bloque>
        <Bloque etiqueta="Cuándo aparece">
          {carta.media !== null
            ? `Con ${MINIMO_CALIFICADAS} predicciones calificadas o más. Llevas ${carta.calificadas}.`
            : `Con ${MINIMO_CALIFICADAS} predicciones calificadas. ${textoFaltan(faltan)}.`}
        </Bloque>
      </>
    );
  } else if (atributo) {
    const valor = atributo.valor(carta);
    contenido = (
      <>
        <Valor valor={valor} nivel={carta.nivel} />
        <View style={{ alignItems: 'center', gap: espacio.xxs }}>
          <Texto variante="titulo2" alineacion="center" accessibilityRole="header">
            {atributo.nombre}
          </Texto>
          <Texto variante="etiqueta" color="textoTenue">
            {`${atributo.codigo} · de 40 a 99`}
          </Texto>
        </View>
        <Bloque etiqueta="Qué mide">{atributo.explicacion}</Bloque>
        <Bloque etiqueta="Cómo se calcula">{atributo.calculo}</Bloque>
        {valor === null && atributo.sinDato && <Bloque etiqueta="Por qué sale —">{atributo.sinDato}</Bloque>}
      </>
    );
  }

  return (
    <HojaModal visible={parte !== null} onCerrar={onCerrar} testID="detalle-carta">
      {contenido}
    </HojaModal>
  );
}
