import { View } from 'react-native';

import { Boton, Esqueleto, Seccion, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import type { MiRacha } from './datos';
import { useMiRacha } from './useMiRacha';
import { useReleerAlVolver } from './useReleerAlVolver';

const mensajes = {
  explicacion: 'Cuenta tus predicciones con puntos, una tras otra. Un partido sin predecir no la rompe.',
  sinRacha: 'Tu racha empieza con tu primer acierto.',
  // S13 (F19 R3).
  explicacionDeOtro: 'Cuenta sus predicciones con puntos, una tras otra. Un partido sin predecir no la rompe.',
  sinRachaDeOtro: 'Su racha empieza con su primer acierto.',
  simulados: 'Incluye partidos simulados',
  error: 'No pudimos cargar tu racha.',
  // Mismo texto que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
} as const;

const textoAciertos = (n: number) => (n === 1 ? 'acierto seguido' : 'aciertos seguidos');

function Numero({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={`${etiqueta}: ${valor} ${textoAciertos(valor)}`}>
      <Texto variante="meta" color="textoTenue">
        {etiqueta}
      </Texto>
      <Texto variante="numero">{valor}</Texto>
      <Texto variante="meta" color="textoTenue">
        {textoAciertos(valor)}
      </Texto>
    </View>
  );
}

/** Los números de la racha y sus notas; S09 y S13 (con `deOtro`, F19 R3, R9) lo comparten. */
export function ContenidoRacha({ racha, deOtro = false }: { racha: MiRacha; deOtro?: boolean }) {
  const { espacio } = useTema();
  const { racha_actual, mejor_racha, incluye_simulados, ultima_calificacion } = racha;

  if (ultima_calificacion === null) {
    return <Texto variante="cuerpo">{deOtro ? mensajes.sinRachaDeOtro : mensajes.sinRacha}</Texto>;
  }
  return (
    <View style={{ gap: espacio.s }}>
      <View style={{ flexDirection: 'row', gap: espacio.l }}>
        <Numero etiqueta="Racha actual" valor={racha_actual} />
        <Numero etiqueta="Mejor racha" valor={mejor_racha} />
      </View>
      <Texto variante="meta" color="textoTenue">
        {deOtro ? mensajes.explicacionDeOtro : mensajes.explicacion}
      </Texto>
      {incluye_simulados && (
        <Texto variante="meta" color="textoTenue">
          {mensajes.simulados}
        </Texto>
      )}
    </View>
  );
}

/**
 * S09, sección "Racha" (F13 R7): racha actual y mejor racha, calculadas por el servidor (D52). Se
 * pide cada vez que se abre S09 (la pestaña sigue montada al cambiar a otra); un error no rompe el
 * resto del perfil.
 */
export function SeccionRacha() {
  const { espacio } = useTema();
  const racha = useMiRacha({ siempreAlMontar: true });

  // Al volver a la pestaña, se pide de nuevo.
  useReleerAlVolver(racha.refetch);

  let contenido;
  if (racha.data !== undefined) {
    contenido = <ContenidoRacha racha={racha.data} />;
  } else if (racha.isError) {
    contenido = (
      <View style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(racha.error) ? mensajes.sinConexion : mensajes.error}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void racha.refetch()} />
      </View>
    );
  } else {
    contenido = (
      <View testID="racha-cargando" style={{ flexDirection: 'row', gap: espacio.l }}>
        <Esqueleto variante="numero" ancho="30%" />
        <Esqueleto variante="numero" ancho="30%" />
      </View>
    );
  }

  return <Seccion etiqueta="Racha">{contenido}</Seccion>;
}
