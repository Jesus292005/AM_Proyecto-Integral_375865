import { View } from 'react-native';

import { esNombreIcono, HojaModal, Insignia, Texto } from '../componentes';
import { formatearDia } from '../formato/fechas';
import { useTema } from '../tema';
import { textoNivel } from './Carta';
import type { InsigniaDeVitrina } from './datos';

const metalDe = { BRONCE: 'bronce', PLATA: 'plata', ORO: 'oro' } as const;

function estado(insignia: InsigniaDeVitrina, deOtro: boolean): string {
  if (insignia.veces === 0) return deOtro ? 'Aún no la tiene' : 'Aún no la tienes';
  if (deOtro) return insignia.veces > 1 ? `La ganó ${insignia.veces} veces` : 'La ganó';
  return insignia.veces > 1 ? `La ganaste ${insignia.veces} veces` : 'La ganaste';
}

/**
 * Detalle de una insignia en hoja sobre la Vitrina (F14 R6, a pedido de Jesús en el guion): medalla
 * grande, nombre, nivel, si la tienes, cómo se gana y, si la ganaste, cuándo y dónde. Se cierra con
 * "Cerrar", tocando fuera o con "atrás" del sistema.
 */
export function DetalleInsignia({
  insignia,
  onCerrar,
  deOtro = false,
}: {
  insignia: InsigniaDeVitrina | null;
  onCerrar: () => void;
  /** S13: en tercera persona y sin grupo ni jornada (F19 R3, decisión 5). */
  deOtro?: boolean;
}) {
  const { espacio } = useTema();

  return (
    <HojaModal visible={insignia !== null} onCerrar={onCerrar} testID="detalle-insignia">
      {insignia && (
        <>
          <Insignia
            nombre={insignia.nombre}
            metal={metalDe[insignia.nivel]}
            icono={esNombreIcono(insignia.icono) ? insignia.icono : 'trofeo'}
            bloqueada={insignia.veces === 0}
            veces={insignia.veces}
            tamano="medallaDetalle"
          />
          <View style={{ alignItems: 'center', gap: espacio.xxs }}>
            <Texto variante="titulo2" alineacion="center" accessibilityRole="header">
              {insignia.nombre}
            </Texto>
            <Texto variante="etiqueta" color="textoTenue">
              {`${textoNivel[insignia.nivel]}${insignia.repetible ? ' · Se puede ganar varias veces' : ''}`}
            </Texto>
            <Texto variante="cuerpoFuerte" color={insignia.veces > 0 ? 'texto' : 'textoTenue'}>
              {estado(insignia, deOtro)}
            </Texto>
          </View>

          <View style={{ alignSelf: 'stretch', gap: espacio.xxs }}>
            <Texto variante="etiqueta" color="textoTenue">
              Cómo se gana
            </Texto>
            <Texto variante="cuerpo">{insignia.descripcion}</Texto>
          </View>

          {insignia.veces > 0 && insignia.ultima_en !== null && (
            <View style={{ alignSelf: 'stretch', gap: espacio.xxs }}>
              <Texto variante="etiqueta" color="textoTenue">
                {insignia.veces > 1 ? 'La última vez' : 'Cuándo'}
              </Texto>
              <Texto variante="cuerpo">{formatearDia(new Date(insignia.ultima_en))}</Texto>
              {(insignia.ultimo_grupo !== null || insignia.ultima_jornada !== null) && (
                <Texto variante="cuerpo" color="texto2">
                  {[insignia.ultimo_grupo, insignia.ultima_jornada].filter(Boolean).join(' · ')}
                </Texto>
              )}
              {insignia.ultima_simulada && (
                <Texto variante="meta" color="textoTenue">
                  Con un partido simulado
                </Texto>
              )}
            </View>
          )}
        </>
      )}
    </HojaModal>
  );
}
