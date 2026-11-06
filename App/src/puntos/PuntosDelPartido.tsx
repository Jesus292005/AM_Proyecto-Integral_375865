import { View } from 'react-native';

import { Boton, Esqueleto, IndicadorEstado, Seccion, Texto } from '../componentes';
import type { Prediccion } from '../partido/eleccion';
import { useTema } from '../tema';
import type { PuntosPrediccion } from './datos';
import {
  esCalificada,
  indicadorAfirmacion,
  type PuntosCalificados,
  textoAfirmacion,
  textos,
} from './presentacion';

// F10 R4–R6: "Tus puntos" y "Bono por tu análisis" en S03 de un partido terminado o cancelado.
// Solo muestra lo que da el servidor (D52): las filas son las partes que predije con sus puntos.

function Fila({ etiqueta, puntos }: { etiqueta: string; puntos: number }) {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      accessible
      accessibilityLabel={`${etiqueta}: ${puntos > 0 ? 'acertada' : 'fallada'}, ${puntos} puntos`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.xs,
        paddingVertical: espacio.xs,
        borderBottomWidth: medidas.linea,
        borderBottomColor: colores.lineaSuave,
      }}
    >
      <IndicadorEstado estado={puntos > 0 ? 'acertada' : 'fallada'} />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte">{etiqueta}</Texto>
      </View>
      <Texto variante="numero" alineacion="right">
        {String(puntos)}
      </Texto>
    </View>
  );
}

function Desglose({ puntos, prediccion }: { puntos: PuntosCalificados; prediccion: Prediccion }) {
  const resultado = puntos.puntos_resultado ?? 0;
  const rango = puntos.puntos_rango_goles ?? 0;
  const marcador = puntos.puntos_marcador ?? 0;

  if (prediccion.marcador_local !== null) {
    if (marcador > 0) return <Fila etiqueta="Marcador exacto" puntos={marcador} />;
    return (
      <>
        <Fila etiqueta="Marcador exacto" puntos={0} />
        <Fila etiqueta="Resultado" puntos={resultado} />
        <Fila etiqueta="Goles en total" puntos={rango} />
        <Texto variante="meta" color="textoTenue">
          {textos.marcadorFallado}
        </Texto>
      </>
    );
  }
  return (
    <>
      {prediccion.resultado !== null && <Fila etiqueta="Resultado" puntos={resultado} />}
      {prediccion.rango_goles !== null && <Fila etiqueta="Goles en total" puntos={rango} />}
    </>
  );
}

function Bono({ puntos }: { puntos: PuntosCalificados }) {
  const { espacio } = useTema();

  if (puntos.estado_bono === 'SIN_JUSTIFICACION') return null;
  if (puntos.estado_bono === 'PENDIENTE' || puntos.estado_bono === 'ERROR') {
    return (
      <Seccion etiqueta="Bono por tu análisis">
        <IndicadorEstado
          estado={puntos.estado_bono === 'PENDIENTE' ? 'pendiente' : 'noVerificable'}
          texto={puntos.estado_bono === 'PENDIENTE' ? textos.bonoPendiente : textos.bonoError}
        />
      </Seccion>
    );
  }
  return (
    <Seccion etiqueta="Bono por tu análisis">
      <Texto variante="numero">{`+${puntos.puntos_bono ?? 0} / 100`}</Texto>
      {puntos.explicacion !== null && <Texto variante="cuerpo">{puntos.explicacion}</Texto>}
      <View style={{ gap: espacio.s }}>
        {(puntos.afirmaciones ?? []).map((afirmacion, i) => (
          <View key={i} style={{ gap: espacio.xxs }}>
            <IndicadorEstado
              estado={indicadorAfirmacion[afirmacion.veredicto]}
              texto={textoAfirmacion[afirmacion.veredicto]}
            />
            <Texto variante="cuerpoFuerte">{afirmacion.texto}</Texto>
            <Texto variante="meta" color="texto2">
              {afirmacion.motivo}
            </Texto>
          </View>
        ))}
      </View>
    </Seccion>
  );
}

type Props =
  | { estado: 'cargando' }
  | { estado: 'error'; onReintentar: () => void }
  | { estado: 'listo'; puntos: PuntosPrediccion; prediccion: Prediccion };

export function PuntosDelPartido(props: Props) {
  const { espacio } = useTema();

  if (props.estado === 'cargando') {
    return (
      <View testID="puntos-cargando" style={{ gap: espacio.s }}>
        <Esqueleto variante="etiqueta" ancho="30%" />
        <Esqueleto variante="marcadorXL" ancho="30%" />
        <Esqueleto variante="cuerpoFuerte" ancho="100%" />
      </View>
    );
  }
  if (props.estado === 'error') {
    return (
      <Seccion etiqueta="Tus puntos">
        <Texto variante="cuerpo">{textos.errorPuntos}</Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={props.onReintentar} />
      </Seccion>
    );
  }

  const { puntos, prediccion } = props;
  if (puntos.estado_prediccion === 'ANULADA') {
    return (
      <Seccion etiqueta="Tus puntos">
        <Texto variante="cuerpo">{textos.anuladoDetalle}</Texto>
      </Seccion>
    );
  }
  if (!esCalificada(puntos)) {
    return (
      <Seccion etiqueta="Tus puntos">
        <IndicadorEstado estado="pendiente" texto={textos.calificandoDetalle} />
      </Seccion>
    );
  }
  return (
    <View style={{ gap: espacio.xl }}>
      <Seccion etiqueta="Tus puntos">
        <Texto variante="marcadorXL" accessibilityLabel={`${puntos.puntos_total} puntos`}>
          {String(puntos.puntos_total)}
        </Texto>
        <View>
          <Desglose puntos={puntos} prediccion={prediccion} />
        </View>
      </Seccion>
      <Bono puntos={puntos} />
    </View>
  );
}
