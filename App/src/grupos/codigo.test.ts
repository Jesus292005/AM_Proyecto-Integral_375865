import { esquemaCodigoInvitacion, formatearCodigo, normalizarCodigo } from './codigo';

describe('código de invitación (F07 R2)', () => {
  it.each(['ABCD-EFGH', 'abcdefgh', ' ABCD EFGH ', 'abcd-efgh'])(
    'F07 CA9: "%s" se acepta y queda canónico',
    (texto) => {
      expect(esquemaCodigoInvitacion.parse(texto)).toBe('ABCDEFGH');
    },
  );

  it.each([
    ['7 caracteres', 'ABCDEFG'],
    ['9 caracteres', 'ABCDEFGHJ'],
    ['con O', 'ABCDEFGO'],
    ['con 0', 'ABCDEFG0'],
    ['con 1', 'ABCDEFG1'],
    ['con I', 'ABCDEFGI'],
    ['con L', 'ABCDEFGL'],
    ['una URL', 'https://example.com'],
    ['vacío', ''],
  ])('F07 CA9: se rechaza un código %s', (_caso, texto) => {
    expect(esquemaCodigoInvitacion.safeParse(texto).success).toBe(false);
  });

  it('normaliza como el servidor y se muestra con guion', () => {
    expect(normalizarCodigo(' ab-cd ')).toBe('ABCD');
    expect(formatearCodigo('ABCDEFGH')).toBe('ABCD-EFGH');
  });
});
