import { esNombreValido, normalizarNombre, renglonesDeNombre } from './nombre';

describe('nombre visible en la app (F28 R4)', () => {
  it('F28 CA4: junta espacios repetidos y quita los de los extremos, como el servidor', () => {
    expect(normalizarNombre('  Chucho \t  10 ')).toBe('Chucho 10');
  });

  it.each([
    ['Chucho 10', true],
    ['Ñoño_Águila-9.', true],
    ['Al', false],
    ['abcdefghijklmnopqrstu', false],
    ['Ana#10', false],
    ['...', false],
    ['      ', false],
  ])('F28 CA4: "%s" válido = %s', (nombre, valido) => {
    expect(esNombreValido(nombre)).toBe(valido);
  });
});

describe('renglones del nombre en grande (S09 y carta)', () => {
  it('sin espacios, un renglón (la letra se reduce en lugar de partir la palabra)', () => {
    expect(renglonesDeNombre('Masturbinho')).toBe(1);
    expect(renglonesDeNombre('  Masturbinho  ')).toBe(1);
  });

  it('con espacios, hasta dos renglones (se parte entre palabras)', () => {
    expect(renglonesDeNombre('El Chucho')).toBe(2);
  });
});
