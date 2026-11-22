import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ProveedorTema } from '../tema';
import { temaGrafito } from '../tema/tokens';
import { EscudoEquipo, type EquipoConEscudo } from './EscudoEquipo';

const { colores, medidas } = temaGrafito;

const america: EquipoConEscudo = {
  nombre_corto: 'América',
  escudo_url: 'https://media.api-sports.io/football/teams/2287.png',
  color_primario: '#FFD100',
  color_texto: '#0B2341',
};

async function dibujar(equipo: EquipoConEscudo, tamano: 'escudoLista' | 'escudoEncabezado') {
  await render(
    <ProveedorTema>
      <EscudoEquipo equipo={equipo} tamano={tamano} />
    </ProveedorTema>,
  );
}

const estilo = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
// `expo-image` entrega sus eventos del módulo nativo con el formato de `nativeEvent`.
const eventoImagen = (tipo: 'load' | 'error') =>
  fireEvent(screen.getByTestId('escudo-archivo'), tipo, { nativeEvent: {} });
const colorDeTexto = (texto: string) => StyleSheet.flatten(screen.getByText(texto).props.style).color;

describe('EscudoEquipo (F22 R3)', () => {
  it('F22 CA3: con URL muestra la imagen, sobre un círculo `superficie2` mientras carga', async () => {
    await dibujar(america, 'escudoLista');

    expect(screen.getByTestId('escudo-archivo').props.source).toEqual([
      { uri: america.escudo_url },
    ]);
    expect(estilo('escudo-imagen').width).toBe(medidas.escudoLista);
    expect(estilo('escudo-imagen').backgroundColor).toBe(colores.superficie2);
    expect(screen.queryByTestId('escudo-respaldo')).toBeNull();

    await eventoImagen('load');
    // Ya cargado, sin fondo ni recorte circular.
    expect(estilo('escudo-imagen').backgroundColor).toBeUndefined();
    expect(estilo('escudo-imagen').borderRadius).toBeUndefined();
  });

  it('F22 CA3: si la imagen falla, círculo del color del equipo con su inicial', async () => {
    await dibujar(america, 'escudoEncabezado');

    await eventoImagen('error');

    expect(screen.queryByTestId('escudo-imagen')).toBeNull();
    expect(estilo('escudo-respaldo').width).toBe(medidas.escudoEncabezado);
    expect(estilo('escudo-respaldo').backgroundColor).toBe('#FFD100');
    expect(colorDeTexto('A')).toBe('#0B2341');
  });

  it('F22 CA3: sin URL usa el respaldo con los colores del equipo', async () => {
    await dibujar({ ...america, escudo_url: '' }, 'escudoLista');

    expect(screen.queryByTestId('escudo-archivo')).toBeNull();
    expect(estilo('escudo-respaldo').backgroundColor).toBe('#FFD100');
    expect(colorDeTexto('A')).toBe('#0B2341');
  });

  it('F22 CA3: sin URL y sin colores, círculo neutro con la inicial en texto tenue', async () => {
    await dibujar(
      { nombre_corto: 'león', escudo_url: '', color_primario: null, color_texto: null },
      'escudoLista',
    );

    expect(estilo('escudo-respaldo').backgroundColor).toBe(colores.superficie2);
    expect(colorDeTexto('L')).toBe(colores.textoTenue);
  });
});
