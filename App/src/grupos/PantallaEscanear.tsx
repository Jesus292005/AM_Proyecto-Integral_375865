import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, EncabezadoPantalla, Texto } from '../componentes';
import { useTema } from '../tema';
import { LectorCamara, usePermisoCamara } from './camara';
import { esquemaCodigoInvitacion, formatearCodigo } from './codigo';
import { registrarLectura } from './lecturaQR';

const mensajes = {
  permiso: 'Necesitamos la cámara para leer el QR. También puedes escribir el código.',
  sinCamara: 'No se pudo abrir la cámara.',
  ajeno: 'Este QR no es una invitación de Campeón de Sillón.',
  guia: 'Apunta al QR del grupo',
} as const;

// F12 R5: el mismo QR ajeno no vuelve a avisar antes de 3 s.
const ESPERA_AVISO_MS = 3000;

/** Regresa a S06; con un código leído, S06 se une con él una vez (F12 R4, `lecturaQR`). */
function volverAUnirse(codigo?: string) {
  router.dismissTo(
    codigo === undefined
      ? '/grupos/unirse'
      : { pathname: '/grupos/unirse', params: { codigo, lectura: registrarLectura(codigo) } },
  );
}

function Lector() {
  const { colores, espacio, medidas } = useTema();
  const [sinCamara, setSinCamara] = useState(false);
  const [ajeno, setAjeno] = useState(false);
  // F12 R4: se deja de leer al primer código válido, aunque la cámara siga entregándolo.
  const leido = useRef(false);
  const ultimoAjeno = useRef<{ contenido: string; en: number } | null>(null);

  function alLeer(contenido: string) {
    if (leido.current) return;
    const codigo = esquemaCodigoInvitacion.safeParse(contenido);
    if (codigo.success) {
      leido.current = true;
      volverAUnirse(formatearCodigo(codigo.data));
      return;
    }
    // F12 R5: nunca se abre ni se ejecuta nada del QR; solo se avisa.
    const ahora = Date.now();
    const previo = ultimoAjeno.current;
    if (previo !== null && previo.contenido === contenido && ahora - previo.en < ESPERA_AVISO_MS) return;
    ultimoAjeno.current = { contenido, en: ahora };
    setAjeno(true);
  }

  if (sinCamara) {
    return (
      <View style={{ gap: espacio.l, paddingVertical: espacio.xl }}>
        <Texto variante="cuerpo" alineacion="center">
          {mensajes.sinCamara}
        </Texto>
        <Boton titulo="Escribir el código" variante="secundario" onPress={() => volverAUnirse()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: espacio.m }}>
      {ajeno && (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: colores.superficie2,
            borderRadius: medidas.radio,
            paddingVertical: espacio.xs,
            paddingHorizontal: espacio.s,
          }}
        >
          <Texto variante="meta" color="texto2">
            {mensajes.ajeno}
          </Texto>
        </View>
      )}
      <View
        style={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: medidas.radio,
          borderWidth: medidas.barraActiva,
          borderColor: colores.acento,
        }}
      >
        <LectorCamara onLeer={alLeer} onError={() => setSinCamara(true)} />
      </View>
      <Texto variante="cuerpo" alineacion="center">
        {mensajes.guia}
      </Texto>
    </View>
  );
}

/** S07: escanear el QR de un grupo dentro de la app (F12, D37); tapa el menú (D76). */
export function PantallaEscanear() {
  const { colores, espacio, medidas } = useTema();
  const { estado, pedir, abrirAjustes } = usePermisoCamara();

  let contenido: ReactNode = null;
  if (estado === 'concedido') contenido = <Lector />;
  else if (estado === 'negado' || estado === 'bloqueado') {
    contenido = (
      <View style={{ gap: espacio.l, paddingVertical: espacio.xl }}>
        <Texto variante="cuerpo" alineacion="center" accessibilityLiveRegion="polite">
          {mensajes.permiso}
        </Texto>
        {estado === 'negado' ? (
          <Boton titulo="Permitir cámara" onPress={pedir} />
        ) : (
          <Boton titulo="Abrir ajustes" onPress={abrirAjustes} />
        )}
        <Boton titulo="Escribir el código" variante="secundario" onPress={() => volverAUnirse()} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: medidas.margenPantalla,
          paddingBottom: espacio.l,
          gap: espacio.l,
        }}
      >
        <EncabezadoPantalla onVolver={() => volverAUnirse()} />
        <Texto variante="titulo1" accessibilityRole="header">
          Escanear QR
        </Texto>
        {contenido}
      </View>
    </SafeAreaView>
  );
}
