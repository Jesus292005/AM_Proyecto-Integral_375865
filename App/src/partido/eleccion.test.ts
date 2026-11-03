import {
  contadorCierre,
  eleccionDe,
  formularioInicial,
  prediccionAbierta,
  puedeGuardar,
  type Formulario,
  type Prediccion,
} from './eleccion';

const vacio = formularioInicial(null);

const guardadaMarcador: Prediccion = {
  resultado: null,
  rango_goles: null,
  marcador_local: 2,
  marcador_visitante: 1,
  actualizada_en: '2026-11-02T10:00:00Z',
};

describe('formularioInicial', () => {
  it('sin predicción abre en "Resultado y goles", sin elegir y con marcador 0-0', () => {
    expect(vacio).toEqual({
      pestana: 'resultadoGoles',
      resultado: null,
      rango: null,
      marcador: { local: 0, visitante: 0 },
    });
  });

  it('con marcador guardado abre en su pestaña', () => {
    expect(formularioInicial(guardadaMarcador)).toMatchObject({
      pestana: 'marcador',
      marcador: { local: 2, visitante: 1 },
    });
  });
});

describe('eleccionDe', () => {
  const completo: Formulario = {
    pestana: 'resultadoGoles',
    resultado: 'LOCAL',
    rango: 'G2',
    marcador: { local: 3, visitante: 3 },
  };

  it('F03 CA7: guarda solo la pestaña de resultado y goles', () => {
    expect(eleccionDe(completo)).toEqual({
      resultado: 'LOCAL',
      rango_goles: 'G2',
      marcador_local: null,
      marcador_visitante: null,
    });
  });

  it('F03 CA7: guarda solo la pestaña del marcador', () => {
    expect(eleccionDe({ ...completo, pestana: 'marcador' })).toEqual({
      resultado: null,
      rango_goles: null,
      marcador_local: 3,
      marcador_visitante: 3,
    });
  });

  it('F03 CA7: sin resultado ni rango no hay elección válida', () => {
    expect(eleccionDe(vacio)).toBeNull();
  });

  it('solo el rango es una elección válida (D06)', () => {
    expect(eleccionDe({ ...vacio, rango: 'G4_MAS' })).toMatchObject({ resultado: null, rango_goles: 'G4_MAS' });
  });
});

describe('puedeGuardar', () => {
  it('F03 CA7: no sin una elección válida', () => {
    expect(puedeGuardar(vacio, null)).toBe(false);
  });

  it('F03 CA7: no si es igual a lo guardado', () => {
    expect(puedeGuardar(formularioInicial(guardadaMarcador), guardadaMarcador)).toBe(false);
  });

  it('F03 CA7: sí si cambia algo de lo guardado', () => {
    const formulario = formularioInicial(guardadaMarcador);
    expect(
      puedeGuardar({ ...formulario, marcador: { local: 2, visitante: 2 } }, guardadaMarcador),
    ).toBe(true);
    expect(puedeGuardar({ ...formulario, pestana: 'resultadoGoles', resultado: 'LOCAL' }, guardadaMarcador))
      .toBe(true);
  });

  it('el marcador 0-0 es una elección válida', () => {
    expect(puedeGuardar({ ...vacio, pestana: 'marcador' }, null)).toBe(true);
  });
});

describe('prediccionAbierta', () => {
  const ahora = new Date('2026-11-02T10:00:00Z');
  const partido = (cierre: string, estado: Parameters<typeof prediccionAbierta>[0]['estado']) => ({
    cierre_predicciones: cierre,
    estado,
  });

  it('abierta antes del cierre si está programado o pospuesto', () => {
    expect(prediccionAbierta(partido('2026-11-02T10:00:01Z', 'PROGRAMADO'), ahora)).toBe(true);
    expect(prediccionAbierta(partido('2026-11-03T10:00:00Z', 'POSPUESTO'), ahora)).toBe(true);
  });

  it('cerrada justo a la hora del cierre y después', () => {
    expect(prediccionAbierta(partido('2026-11-02T10:00:00Z', 'PROGRAMADO'), ahora)).toBe(false);
    expect(prediccionAbierta(partido('2026-11-02T09:00:00Z', 'PROGRAMADO'), ahora)).toBe(false);
  });

  it('cerrada en juego, terminado o cancelado aunque el cierre no haya pasado', () => {
    for (const estado of ['EN_JUEGO', 'TERMINADO', 'CANCELADO'] as const) {
      expect(prediccionAbierta(partido('2026-11-03T10:00:00Z', estado), ahora)).toBe(false);
    }
  });
});

describe('contadorCierre (F03 R8)', () => {
  const ahora = new Date('2026-11-02T10:00:00Z');

  it('con menos de 24 h cuenta hh:mm:ss', () => {
    expect(contadorCierre(new Date('2026-11-02T12:14:08Z'), ahora)).toBe('02:14:08');
    expect(contadorCierre(new Date('2026-11-03T09:59:59Z'), ahora)).toBe('23:59:59');
  });

  it('con 24 h o más no cuenta (se muestra la fecha)', () => {
    expect(contadorCierre(new Date('2026-11-03T10:00:00Z'), ahora)).toBeNull();
  });

  it('nunca es negativo', () => {
    expect(contadorCierre(new Date('2026-11-02T09:00:00Z'), ahora)).toBe('00:00:00');
  });
});
