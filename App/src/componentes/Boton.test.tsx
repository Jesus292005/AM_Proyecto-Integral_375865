import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProveedorTema } from '../tema';
import { Boton } from './Boton';

async function renderBoton(ui: React.ReactElement) {
  await render(<ProveedorTema>{ui}</ProveedorTema>);
}

describe('Boton', () => {
  it('llama a onPress al tocarlo', async () => {
    const onPress = jest.fn();
    await renderBoton(<Boton titulo="Predecir" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Predecir' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no responde si está deshabilitado', async () => {
    const onPress = jest.fn();
    await renderBoton(<Boton titulo="Predecir" onPress={onPress} deshabilitado />);

    await fireEvent.press(screen.getByRole('button', { name: 'Predecir' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Predecir' })).toBeDisabled();
  });

  it('al cargar muestra el indicador y no permite toques repetidos', async () => {
    const onPress = jest.fn();
    await renderBoton(<Boton titulo="Continuar" onPress={onPress} cargando />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('boton-cargando')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeBusy();
  });
});
