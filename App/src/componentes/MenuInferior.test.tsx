import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorTema } from '../tema';
import { temaGrafito } from '../tema/tokens';
import { MenuInferior } from './MenuInferior';

const destinos = [
  { clave: 'inicio', etiqueta: 'Inicio' },
  { clave: 'partidos', etiqueta: 'Partidos' },
  { clave: 'grupos', etiqueta: 'Grupos' },
  { clave: 'perfil', etiqueta: 'Perfil' },
];

const metricas = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderMenu(onSeleccionar = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={metricas}>
      <ProveedorTema>
        <MenuInferior destinos={destinos} activo="partidos" onSeleccionar={onSeleccionar} />
      </ProveedorTema>
    </SafeAreaProvider>,
  );
  return onSeleccionar;
}

describe('MenuInferior', () => {
  it('muestra los 4 destinos y marca solo el activo', async () => {
    await renderMenu();

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Partidos' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Inicio' })).not.toBeSelected();
  });

  it('el activo lleva la barra en acento y texto principal; los demás, texto tenue', async () => {
    await renderMenu();
    const { colores, medidas } = temaGrafito;

    const activo = StyleSheet.flatten(screen.getByRole('tab', { name: 'Partidos' }).props.style);
    expect(activo.borderTopWidth).toBe(medidas.barraActiva);
    expect(activo.borderTopColor).toBe(colores.acento);
    expect(StyleSheet.flatten(screen.getByText('Partidos').props.style).color).toBe(colores.texto);

    const inactivo = StyleSheet.flatten(screen.getByRole('tab', { name: 'Grupos' }).props.style);
    expect(inactivo.borderTopColor).toBe('transparent');
    expect(StyleSheet.flatten(screen.getByText('Grupos').props.style).color).toBe(
      colores.textoTenue,
    );
  });

  it('avisa qué destino se tocó', async () => {
    const onSeleccionar = await renderMenu();

    await fireEvent.press(screen.getByRole('tab', { name: 'Grupos' }));

    expect(onSeleccionar).toHaveBeenCalledWith('grupos');
  });
});
