// F10: puntos en la tarjeta de S02 (R3, CA3) y desglose en S03 (R4–R6, CA4). Los componentes
// reciben lo que da la vista `mis_puntos`; no calculan nada (D52).
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Prediccion } from '../partido/eleccion';
import type { PartidoDeLista } from '../partidos/datos';
import { FilaPartido } from '../partidos/FilaPartido';
import { ProveedorTema } from '../tema';
import type { PuntosPrediccion } from './datos';
import { PuntosDelPartido } from './PuntosDelPartido';

function puntos(extra: Partial<PuntosPrediccion> = {}): PuntosPrediccion {
  return {
    partido_id: 1,
    estado_prediccion: 'ACERTADA',
    estado_bono: 'SIN_JUSTIFICACION',
    puntos_resultado: 100,
    puntos_rango_goles: 0,
    puntos_marcador: 0,
    puntos_base: 100,
    puntos_bono: null,
    puntos_total: 100,
    explicacion: null,
    afirmaciones: null,
    ...extra,
  };
}

function partido(extra: Partial<PartidoDeLista> = {}): PartidoDeLista {
  return {
    id: 1,
    inicio: '2024-07-13T20:00:00Z',
    estado: 'TERMINADO',
    goles_local: 2,
    goles_visitante: 1,
    local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/p.png' },
    visitante: { nombre_corto: 'Querétaro', escudo_url: 'https://x.mx/q.png' },
    es_simulado: false,
    predicho: true,
    ...extra,
  };
}

async function fila(p: PartidoDeLista, pts?: PuntosPrediccion) {
  await render(
    <ProveedorTema>
      <FilaPartido partido={p} puntos={pts} onPress={() => {}} />
    </ProveedorTema>,
  );
}

describe('F10 CA3: la tarjeta de S02', () => {
  it('F10 CA3: calificada muestra el estado con ícono y el total que da el servidor', async () => {
    await fila(partido(), puntos({ estado_bono: 'EVALUADA', puntos_bono: 60, puntos_total: 160 }));
    expect(screen.getByTestId('indicador-acertada')).toBeTruthy();
    expect(screen.getByText('+160')).toBeTruthy();
    expect(screen.queryByText('bono pendiente')).toBeNull();
    expect(screen.queryByText('Predicho')).toBeNull();
    expect(screen.getByRole('button').props.accessibilityLabel).toContain('Acertada, 160 puntos');
  });

  it('F10 CA3: con el bono pendiente lo dice junto al total', async () => {
    await fila(partido(), puntos({ estado_prediccion: 'PARCIAL', estado_bono: 'PENDIENTE' }));
    expect(screen.getByTestId('indicador-parcial')).toBeTruthy();
    expect(screen.getByText('+100')).toBeTruthy();
    expect(screen.getByText('bono pendiente')).toBeTruthy();
  });

  it('F10 CA3: fallada muestra +0 con su ícono', async () => {
    await fila(partido(), puntos({ estado_prediccion: 'FALLADA', puntos_resultado: 0, puntos_base: 0, puntos_total: 0 }));
    expect(screen.getByTestId('indicador-fallada')).toBeTruthy();
    expect(screen.getByText('+0')).toBeTruthy();
  });

  it('F10 CA3: terminado sin calificar dice "Calificando…"', async () => {
    await fila(partido(), puntos({ estado_prediccion: 'SIN_CALIFICAR', puntos_base: null, puntos_total: null }));
    expect(screen.getByText('Calificando…')).toBeTruthy();
  });

  it('F10 CA3: un partido cancelado con predicción dice "Anulado"', async () => {
    await fila(
      partido({ estado: 'CANCELADO', goles_local: null, goles_visitante: null }),
      puntos({ estado_prediccion: 'ANULADA', puntos_base: null, puntos_total: null }),
    );
    expect(screen.getByText('Anulado')).toBeTruthy();
  });

  it('F10 CA3: sin predicción no muestra nada; sin terminar sigue "Predicho" (F03)', async () => {
    await fila(partido({ predicho: false }));
    expect(screen.queryByText('Predicho')).toBeNull();
    expect(screen.queryByText(/^\+/)).toBeNull();

    await fila(partido({ id: 2, estado: 'PROGRAMADO', goles_local: null, goles_visitante: null }));
    expect(screen.getByText('Predicho')).toBeTruthy();
  });

  it('F10 R3: terminado con predicción y sin puntos cargados (o con error) no muestra "Predicho" ni puntos', async () => {
    await fila(partido());
    expect(screen.queryByText('Predicho')).toBeNull();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});

const marcador21: Prediccion = {
  resultado: null,
  rango_goles: null,
  marcador_local: 2,
  marcador_visitante: 1,
  justificacion: 'Puebla va a tirar más.',
  actualizada_en: '2024-07-13T19:00:00Z',
};

async function detalle(pts: PuntosPrediccion, prediccion: Prediccion = marcador21) {
  await render(
    <ProveedorTema>
      <PuntosDelPartido estado="listo" puntos={pts} prediccion={prediccion} />
    </ProveedorTema>,
  );
}

describe('F10 CA4: el desglose de S03', () => {
  it('F10 CA4: marcador exacto con bono evaluado: total, fila, bono, explicación y afirmaciones', async () => {
    await detalle(
      puntos({
        puntos_resultado: 0,
        puntos_marcador: 350,
        puntos_base: 350,
        estado_bono: 'EVALUADA',
        puntos_bono: 60,
        puntos_total: 410,
        explicacion: 'Leíste bien los tiros.',
        afirmaciones: [
          { texto: 'Puebla tira más', veredicto: 'ACERTADA', motivo: '17 contra 10.', evidencia: ['S2'] },
          { texto: 'Querétaro domina', veredicto: 'CERCANA', motivo: '51% de posesión.', evidencia: ['S1'] },
          { texto: 'Habrá roja', veredicto: 'FALLADA', motivo: 'No hubo rojas.', evidencia: ['S13'] },
          { texto: 'El técnico acierta', veredicto: 'NO_VERIFICABLE', motivo: 'No está en los datos.', evidencia: [] },
        ],
      }),
    );
    expect(screen.getByText('410')).toBeTruthy();
    expect(screen.getByLabelText('Marcador exacto: acertada, 350 puntos')).toBeTruthy();
    expect(screen.queryByText('Resultado')).toBeNull();
    expect(screen.getByText('+60 / 100')).toBeTruthy();
    expect(screen.getByText('Leíste bien los tiros.')).toBeTruthy();
    for (const [texto, veredicto] of [
      ['Acertada', 'acertada'],
      ['Cercana', 'parcial'],
      ['Fallada', 'fallada'],
      ['No verificable', 'noVerificable'],
    ] as const) {
      expect(screen.getByText(texto)).toBeTruthy();
      expect(screen.getAllByTestId(`indicador-${veredicto}`).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('51% de posesión.')).toBeTruthy();
  });

  it('F10 CA4: marcador fallado muestra sus partes acertadas y la nota', async () => {
    await detalle(puntos({ puntos_resultado: 100, puntos_rango_goles: 150, puntos_base: 250, puntos_total: 250, estado_prediccion: 'PARCIAL' }));
    expect(screen.getByText('250')).toBeTruthy();
    expect(screen.getByLabelText('Marcador exacto: fallada, 0 puntos')).toBeTruthy();
    expect(screen.getByLabelText('Resultado: acertada, 100 puntos')).toBeTruthy();
    expect(screen.getByLabelText('Goles en total: acertada, 150 puntos')).toBeTruthy();
    expect(screen.getByText('Marcador fallado: sumaste las partes que acertaste.')).toBeTruthy();
  });

  it('F10 CA4: resultado y rango muestran solo lo que predije', async () => {
    await detalle(puntos({ estado_prediccion: 'PARCIAL' }), {
      ...marcador21,
      marcador_local: null,
      marcador_visitante: null,
      resultado: 'LOCAL',
      rango_goles: 'G2',
      justificacion: null,
    });
    expect(screen.getByLabelText('Resultado: acertada, 100 puntos')).toBeTruthy();
    expect(screen.getByLabelText('Goles en total: fallada, 0 puntos')).toBeTruthy();
    expect(screen.queryByText('Marcador exacto')).toBeNull();
    expect(screen.queryByText('Bono por tu análisis')).toBeNull();
  });

  it('F10 CA4: bono pendiente y bono con error dicen su estado', async () => {
    await detalle(puntos({ estado_bono: 'PENDIENTE' }));
    expect(screen.getByText('Bono pendiente: la IA está revisando tu análisis.')).toBeTruthy();

    await detalle(puntos({ estado_bono: 'ERROR' }));
    expect(screen.getByText('Bono no disponible para este partido.')).toBeTruthy();
  });

  it('F10 CA4: anulada y sin calificar', async () => {
    await detalle(puntos({ estado_prediccion: 'ANULADA', puntos_base: null, puntos_total: null }));
    expect(screen.getByText('Partido cancelado: tu predicción se anuló y no cuenta.')).toBeTruthy();

    await detalle(puntos({ estado_prediccion: 'SIN_CALIFICAR', puntos_base: null, puntos_total: null }));
    expect(screen.getByText('Calificando tus puntos…')).toBeTruthy();
  });

  it('F10 estados: error al cargar solo los puntos ofrece reintentar', async () => {
    const reintentar = jest.fn();
    await render(
      <ProveedorTema>
        <PuntosDelPartido estado="error" onReintentar={reintentar} />
      </ProveedorTema>,
    );
    expect(screen.getByText('No se pudieron cargar tus puntos.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reintentar).toHaveBeenCalledTimes(1);
  });
});
