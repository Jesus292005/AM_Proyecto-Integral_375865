import { useState } from 'react';
import { View } from 'react-native';

import { Boton, Esqueleto, Seccion, Texto } from '../componentes';
import { esSinConexion } from '../datos/errores';
import { useTema } from '../tema';
import { atributos, Carta, type CodigoAtributo } from './Carta';
import { useMiCarta } from './useMiCarta';
import { useMiPerfil } from './useMiPerfil';
import { useReleerAlVolver } from './useReleerAlVolver';

const mensajes = {
  explicacion: 'Se calcula con todas tus predicciones calificadas. Toca un atributo para ver cómo.',
  simulados: 'Incluye partidos simulados',
  error: 'No pudimos cargar tu carta.',
  // Mismo texto que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
} as const;

/** Esqueleto con la forma de la carta (F20 Estados). */
function EsqueletoCarta() {
  const { colores, espacio, medidas } = useTema();

  return (
    <View
      testID="carta-cargando"
      style={{
        borderRadius: medidas.radioModal,
        padding: espacio.m,
        gap: espacio.m,
        backgroundColor: colores.superficie,
      }}
    >
      <Esqueleto variante="titulo1" ancho="60%" />
      <Esqueleto variante="numero" ancho="100%" />
    </View>
  );
}

/** S09, sección "Tu carta" (F20 R7–R8); un error no rompe el resto del perfil. */
export function SeccionCarta() {
  const { espacio } = useTema();
  const carta = useMiCarta({ siempreAlMontar: true });
  const perfil = useMiPerfil();
  const [elegido, setElegido] = useState<CodigoAtributo | null>(null);
  useReleerAlVolver(carta.refetch);

  let contenido;
  if (carta.data !== undefined && perfil.data !== undefined) {
    const detalle = atributos.find((a) => a.codigo === elegido);
    contenido = (
      <View style={{ gap: espacio.s }}>
        <Carta
          carta={carta.data}
          perfil={perfil.data}
          elegido={elegido}
          onElegir={(codigo) => setElegido((antes) => (antes === codigo ? null : codigo))}
        />
        {detalle && (
          <Texto variante="cuerpo" accessibilityLiveRegion="polite">
            {`${detalle.nombre}: ${detalle.explicacion}`}
          </Texto>
        )}
        <Texto variante="meta" color="textoTenue">
          {mensajes.explicacion}
        </Texto>
        {carta.data.incluye_simulados && (
          <Texto variante="meta" color="textoTenue">
            {mensajes.simulados}
          </Texto>
        )}
      </View>
    );
  } else if (carta.isError) {
    contenido = (
      <View style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(carta.error) ? mensajes.sinConexion : mensajes.error}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void carta.refetch()} />
      </View>
    );
  } else if (perfil.isError) {
    // La carta lleva la foto, el nombre y el equipo del perfil.
    contenido = (
      <View style={{ gap: espacio.s }}>
        <Texto variante="meta" color="fallo">
          {esSinConexion(perfil.error) ? mensajes.sinConexion : mensajes.error}
        </Texto>
        <Boton titulo="Reintentar" variante="secundario" onPress={() => void perfil.refetch()} />
      </View>
    );
  } else {
    contenido = <EsqueletoCarta />;
  }

  return <Seccion etiqueta="Tu carta">{contenido}</Seccion>;
}
