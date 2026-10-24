import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, Texto } from '../componentes';
import { iniciarSesionGoogle } from '../sesion/iniciarSesionGoogle';
import { useSesion } from '../sesion/ProveedorSesion';
import { useTema } from '../tema';

// Estados de S01 (F01 §11). Cancelar el selector regresa a `inicial`, sin mensaje (CA5).
type EstadoS01 = 'inicial' | 'cargando' | 'sinConexion' | 'sinServiciosGoogle' | 'error';

// F01 §10.
const mensajes = {
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  sinServiciosGoogle:
    'Necesitas instalar o actualizar los servicios de Google Play para iniciar sesión.',
  error: 'No pudimos iniciar sesión. Inténtalo de nuevo.',
} as const;

function InicioSesion() {
  const { colores, espacio, medidas } = useTema();
  const [estado, setEstado] = useState<EstadoS01>('inicial');
  // Evita un segundo intento si llegan dos toques antes de que el botón se deshabilite.
  const enCurso = useRef(false);

  async function intentar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setEstado('cargando');
    const resultado = await iniciarSesionGoogle();
    enCurso.current = false;
    // Con éxito llega SIGNED_IN y esta pantalla se va al destino; el botón sigue cargando.
    if (resultado.tipo === 'exito') return;
    setEstado(resultado.tipo === 'cancelado' ? 'inicial' : resultado.tipo);
  }

  const conMensaje = estado !== 'inicial' && estado !== 'cargando';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: medidas.margenPantalla,
          gap: espacio.xxl,
        }}
      >
        <Texto variante="titulo1" accessibilityRole="header">
          Campeón de Sillón
        </Texto>
        {conMensaje ? (
          // Error y sin conexión (05-ui §6): mensaje + "Reintentar" secundario.
          <View style={{ gap: espacio.m }}>
            <Texto variante="cuerpo" accessibilityRole="alert" accessibilityLiveRegion="polite">
              {mensajes[estado]}
            </Texto>
            <Boton titulo="Reintentar" variante="secundario" onPress={() => void intentar()} />
          </View>
        ) : (
          <Boton
            titulo="Continuar con Google"
            onPress={() => void intentar()}
            cargando={estado === 'cargando'}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

export default function Login() {
  const { estado, destino } = useSesion();

  if (estado.tipo === 'cargando') return null;
  // Con sesión, S01 no se muestra: se continúa a la ruta pedida o a Inicio (F01 §5.7, CA8).
  if (estado.tipo === 'conSesion') return <Redirect href={destino ?? '/inicio'} />;

  return <InicioSesion />;
}
