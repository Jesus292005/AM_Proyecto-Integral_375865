import { Text, type TextProps } from 'react-native';

import { useTema, type NombreColor, type VarianteTexto } from '../tema';

interface Props extends Omit<TextProps, 'style' | 'maxFontSizeMultiplier'> {
  variante: VarianteTexto;
  color?: NombreColor;
  alineacion?: 'left' | 'center' | 'right';
}

/** Única forma de mostrar texto (05-ui §5). No acepta `style`: todo sale de los tokens. */
export function Texto({ variante, color = 'texto', alineacion, ...props }: Props) {
  const { colores, tipografia, medidas } = useTema();
  const t = tipografia[variante];
  // Con interlineado menor que el tamaño (titulo1, marcadorXL), Android recorta lo que sobresale
  // arriba de la primera línea (acentos de mayúsculas). Se amplía la caja hacia arriba y se
  // compensa con margen negativo para no mover el diseño.
  const sobrante = Math.max(0, t.fontSize - t.lineHeight);

  return (
    <Text
      {...props}
      maxFontSizeMultiplier={medidas.escalaTextoMaxima}
      style={{
        color: colores[color],
        fontFamily: t.fontFamily,
        fontSize: t.fontSize,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
        textTransform: t.mayusculas ? 'uppercase' : 'none',
        textAlign: alineacion,
        includeFontPadding: false,
        paddingTop: sobrante,
        marginTop: -sobrante,
        transform: t.esTeko ? [{ translateY: t.fontSize * medidas.ajusteTekoEm }] : undefined,
      }}
    />
  );
}
