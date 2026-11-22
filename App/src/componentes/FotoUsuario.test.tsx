import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ProveedorTema } from '../tema';
import { temaGrafito } from '../tema/tokens';
import { FotoUsuario } from './FotoUsuario';

const { colores, medidas, tipografia } = temaGrafito;

async function dibujar(url: string | null, tamano?: 'fotoLista' | 'fotoPerfil') {
  await render(
    <ProveedorTema>
      <FotoUsuario url={url} nombre="chucho" tamano={tamano} />
    </ProveedorTema>,
  );
}

const estilo = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe('FotoUsuario (F28 R1)', () => {
  it('F28 CA3: con URL muestra la foto de Google en círculo, sobre superficie2 mientras carga', async () => {
    await dibujar('https://example.com/foto.png', 'fotoPerfil');

    expect(screen.getByTestId('foto-usuario-archivo').props.source).toEqual([
      { uri: 'https://example.com/foto.png' },
    ]);
    expect(estilo('foto-usuario')).toMatchObject({
      width: medidas.fotoPerfil,
      borderRadius: medidas.fotoPerfil / 2,
      backgroundColor: colores.superficie2,
    });
  });

  it('F28 CA3: si la foto falla, la inicial en Teko', async () => {
    await dibujar('https://example.com/foto.png');

    await fireEvent(screen.getByTestId('foto-usuario-archivo'), 'error', { nativeEvent: {} });

    expect(screen.getByText('C')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByText('C').props.style).fontFamily).toBe(
      tipografia.pestana.fontFamily,
    );
  });

  it('F28 CA3: sin foto, la inicial del tamaño pedido', async () => {
    await dibujar(null, 'fotoPerfil');

    expect(estilo('foto-usuario-inicial').width).toBe(medidas.fotoPerfil);
    expect(StyleSheet.flatten(screen.getByText('C').props.style).fontSize).toBe(
      tipografia.titulo1.fontSize,
    );
  });
});
