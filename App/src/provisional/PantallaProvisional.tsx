// PROVISIONAL (T03): pantalla vacía con su título, parámetros recibidos y enlaces a las rutas
// a las que puede ir (02-navigation §3). Cada pantalla se reemplaza al construir su feature.
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, EncabezadoPantalla, Texto } from '../componentes';
import { useTema } from '../tema';

export interface Enlace {
  titulo: string;
  href: Href;
}

interface Props {
  id: string;
  titulo: string;
  /**
   * `raizPestana`: primera pantalla de una pestaña (sin "volver").
   * `detallePestana`: pantalla dentro de una pestaña, con "volver" y menú inferior.
   * `sinMenu`: inicio de sesión, modales y cámara (tapan el menú).
   * Con menú, el propio menú cubre el área segura de abajo.
   */
  ubicacion?: 'raizPestana' | 'detallePestana' | 'sinMenu';
  parametros?: Record<string, string | undefined>;
  enlaces?: readonly Enlace[];
  children?: ReactNode;
}

export function PantallaProvisional({
  id,
  titulo,
  ubicacion = 'sinMenu',
  parametros = {},
  enlaces = [],
  children,
}: Props) {
  const { colores, espacio, medidas } = useTema();
  const puedeVolver = ubicacion !== 'raizPestana' && router.canGoBack();

  return (
    <SafeAreaView
      edges={ubicacion === 'sinMenu' ? ['top', 'bottom'] : ['top']}
      style={{ flex: 1, backgroundColor: colores.fondo }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.xl,
          gap: espacio.m,
        }}
      >
        <EncabezadoPantalla onVolver={puedeVolver ? () => router.back() : undefined} meta={id} />
        <Texto variante="titulo1" accessibilityRole="header">
          {titulo}
        </Texto>
        {Object.entries(parametros).map(([nombre, valor]) => (
          <Texto key={nombre} variante="meta" color="textoTenue">
            {`${nombre}: ${valor ?? '—'}`}
          </Texto>
        ))}
        {enlaces.length > 0 && (
          <View style={{ gap: espacio.s }}>
            <Texto variante="etiqueta" color="textoTenue">
              Rutas (provisional T03)
            </Texto>
            {enlaces.map((e) => (
              <Boton
                key={e.titulo}
                titulo={e.titulo}
                variante="secundario"
                onPress={() => router.navigate(e.href)}
              />
            ))}
          </View>
        )}
        {/* Partes reales que ya existen de la pantalla (p. ej. "Cerrar sesión" en S09). */}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
