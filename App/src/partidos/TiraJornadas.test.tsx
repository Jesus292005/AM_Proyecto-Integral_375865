import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { ProveedorTema } from '../tema';
import { TiraJornadas } from './TiraJornadas';

const jornadas = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  orden: i + 1,
  nombre: `Jornada ${i + 1}`,
}));

const layout = (x: number, width: number) => ({
  nativeEvent: { layout: { x, y: 0, width, height: 44 } },
});

describe('TiraJornadas (F23 R2)', () => {
  it('F23 R2: se desplaza para dejar la jornada elegida al centro', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const vista = (elegida: number) => (
      <ProveedorTema>
        <TiraJornadas jornadas={jornadas} elegida={elegida} actual={10} onElegir={() => {}} />
      </ProveedorTema>
    );
    await render(vista(10));

    // Celdas de 50 de ancho cada 54 (con el espacio entre ellas); vista de 300.
    for (const { orden } of jornadas) {
      await fireEvent(screen.getByTestId(`jornada-${orden}`), 'layout', layout((orden - 1) * 54, 50));
    }
    await fireEvent(screen.getByTestId('tira-jornadas'), 'layout', layout(0, 300));
    // J10 empieza en 486: su centro (511) menos la mitad de la vista (150).
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 361, animated: false });

    await screen.rerender(vista(1));
    // J1 no se puede centrar más allá del inicio.
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });
    scrollTo.mockRestore();
  });
});
