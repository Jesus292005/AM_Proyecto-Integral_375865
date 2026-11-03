import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProveedorTema } from '../tema';
import { CampoTexto } from './CampoTexto';
import { coloresGrafito } from '../tema/tokens';

function campo(props: Partial<Parameters<typeof CampoTexto>[0]> = {}) {
  return render(
    <ProveedorTema>
      <CampoTexto valor="" onCambiar={() => {}} etiqueta="Análisis" maximo={10} {...props} />
    </ProveedorTema>,
  );
}

const linea = () => screen.getByLabelText('Análisis').props.style.borderBottomColor as string;

describe('CampoTexto (05-ui §5)', () => {
  it('muestra el contador y limita el texto al máximo', async () => {
    const onCambiar = jest.fn();
    await campo({ valor: 'hola', onCambiar });

    expect(screen.getByText('4/10')).toBeOnTheScreen();
    expect(screen.getByLabelText('Análisis').props.maxLength).toBe(10);
    await fireEvent.changeText(screen.getByLabelText('Análisis'), 'hola mundo');
    expect(onCambiar).toHaveBeenCalledWith('hola mundo');
  });

  it('al llegar al máximo el contador va en `fallo`', async () => {
    await campo({ valor: '0123456789' });
    expect(screen.getByText('10/10').props.style.color).toBe(coloresGrafito.fallo);
  });

  it('enfocado: línea en acento', async () => {
    await campo();
    expect(linea()).toBe(coloresGrafito.linea);
    await fireEvent(screen.getByLabelText('Análisis'), 'focus');
    expect(linea()).toBe(coloresGrafito.acento);
  });

  it('error: línea en `fallo` y el mensaje', async () => {
    await campo({ error: 'Revisa el texto.' });
    expect(linea()).toBe(coloresGrafito.fallo);
    expect(screen.getByText('Revisa el texto.')).toBeOnTheScreen();
  });

  it('deshabilitado: no se edita', async () => {
    await campo({ deshabilitado: true });
    expect(screen.getByLabelText('Análisis').props.editable).toBe(false);
  });
});
