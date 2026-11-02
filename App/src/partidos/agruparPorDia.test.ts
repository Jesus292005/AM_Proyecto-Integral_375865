import { formatearDia, formatearHora } from '../formato/fechas';
import { agruparPorDia, elegirJornada } from './agruparPorDia';
import type { PartidoDeLista } from './datos';

const TIJUANA = 'America/Tijuana';

function partido(id: number, inicio: string): PartidoDeLista {
  return {
    id,
    inicio,
    estado: 'PROGRAMADO',
    goles_local: null,
    goles_visitante: null,
    local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png' },
    visitante: { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png' },
  };
}

describe('formato de fechas (es-MX)', () => {
  it('muestra la hora en la zona indicada, con a. m./p. m. y espacios normales', () => {
    // 2024-07-06 03:00 UTC = 5 de julio, 20:00 en Tijuana (UTC-7).
    const hora = formatearHora(new Date('2024-07-06T03:00:00Z'), TIJUANA);
    expect(hora).toMatch(/^8:00 p\. ?m\.$/);
    expect(hora).not.toMatch(/[  ]/);
  });

  it('muestra el día abreviado en la zona indicada', () => {
    expect(formatearDia(new Date('2024-07-06T03:00:00Z'), TIJUANA)).toBe('vie 5 jul');
  });
});

describe('agruparPorDia', () => {
  it('agrupa por día en la hora del teléfono y ordena por hora (CA9)', () => {
    const dias = agruparPorDia(
      [
        partido(3, '2024-07-07T01:00:00Z'), // 6 jul, 18:00 en Tijuana
        partido(1, '2024-07-06T03:00:00Z'), // 5 jul, 20:00 en Tijuana (en UTC ya es 6)
        partido(2, '2024-07-06T22:00:00Z'), // 6 jul, 15:00 en Tijuana
      ],
      TIJUANA,
    );

    expect(dias.map((d) => d.titulo)).toEqual(['vie 5 jul', 'sáb 6 jul']);
    expect(dias.map((d) => d.data.map((p) => p.id))).toEqual([[1], [2, 3]]);
  });

  it('con la misma hora ordena por id', () => {
    const dias = agruparPorDia(
      [partido(9, '2024-07-06T22:00:00Z'), partido(4, '2024-07-06T22:00:00Z')],
      TIJUANA,
    );
    expect(dias[0]?.data.map((p) => p.id)).toEqual([4, 9]);
  });

  it('sin partidos no hay días', () => {
    expect(agruparPorDia([], TIJUANA)).toEqual([]);
  });
});

describe('elegirJornada', () => {
  const jornadas = [
    { id: 11, orden: 1, nombre: 'Jornada 1' },
    { id: 12, orden: 2, nombre: 'Jornada 2' },
    { id: 19, orden: 19, nombre: 'Liguilla · Cuartos' },
  ];

  it('usa la jornada de la ruta (por su orden)', () => {
    expect(elegirJornada(jornadas, '19', 1)?.id).toBe(19);
  });

  it('sin jornada en la ruta usa la actual (B3, Q4)', () => {
    expect(elegirJornada(jornadas, undefined, 2)?.id).toBe(12);
  });

  it('una jornada de ruta que no existe usa la actual', () => {
    for (const orden of ['18', 'abc', '', '2.5']) {
      expect(elegirJornada(jornadas, orden, 2)?.id).toBe(12);
    }
  });

  it('sin jornada actual usa la última; sin jornadas, ninguna', () => {
    expect(elegirJornada(jornadas, undefined, null)?.id).toBe(19);
    expect(elegirJornada([], undefined, 1)).toBeUndefined();
  });
});
