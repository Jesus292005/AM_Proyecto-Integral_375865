import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ProveedorTema } from '../tema';
import { temaGrafito } from '../tema/tokens';
import { Texto } from './Texto';

async function renderTexto(ui: React.ReactElement) {
  await render(<ProveedorTema>{ui}</ProveedorTema>);
}

describe('Texto', () => {
  it('aplica el token tipográfico y el color por defecto', async () => {
    await renderTexto(<Texto variante="cuerpo">Hola</Texto>);
    const estilo = StyleSheet.flatten(screen.getByText('Hola').props.style);

    expect(estilo.fontFamily).toBe(temaGrafito.tipografia.cuerpo.fontFamily);
    expect(estilo.fontSize).toBe(15);
    expect(estilo.lineHeight).toBe(21);
    expect(estilo.color).toBe(temaGrafito.colores.texto);
    expect(estilo.transform).toBeUndefined();
  });

  it('compensa Teko una sola vez y pone mayúsculas', async () => {
    await renderTexto(<Texto variante="titulo2">Predecir</Texto>);
    const estilo = StyleSheet.flatten(screen.getByText('Predecir').props.style);

    expect(estilo.textTransform).toBe('uppercase');
    expect(estilo.transform).toEqual([{ translateY: 28 * temaGrafito.medidas.ajusteTekoEm }]);
  });

  it('no recorta acentos con interlineado menor que el tamaño, sin mover el diseño', async () => {
    await renderTexto(<Texto variante="titulo1">Campeón</Texto>);
    const estilo = StyleSheet.flatten(screen.getByText('Campeón').props.style);
    const sobrante = 46 - 46 * 0.85;

    expect(estilo.paddingTop).toBeCloseTo(sobrante);
    expect(estilo.marginTop).toBeCloseTo(-sobrante);
  });

  it('usa el color pedido y limita el tamaño de letra del sistema a 1.3×', async () => {
    await renderTexto(
      <Texto variante="meta" color="acento">
        Cierra en
      </Texto>,
    );
    const texto = screen.getByText('Cierra en');

    expect(StyleSheet.flatten(texto.props.style).color).toBe(temaGrafito.colores.acento);
    expect(texto.props.maxFontSizeMultiplier).toBe(1.3);
  });
});
