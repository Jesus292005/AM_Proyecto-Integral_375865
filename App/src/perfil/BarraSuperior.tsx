import { router } from 'expo-router';
import { type ReactNode, useCallback } from 'react';
import { Pressable, View } from 'react-native';

import { DegradadoMetal, EscudoEquipo, Esqueleto, FotoUsuario, Icono, Texto } from '../componentes';
import { useTema } from '../tema';
import { textoNivel } from './Carta';
import type { MiCarta } from './datos';
import { useMiCarta } from './useMiCarta';
import { useMiPerfil } from './useMiPerfil';
import { useMiRacha } from './useMiRacha';
import { useReleerAlVolver } from './useReleerAlVolver';

const metalDe = { BRONCE: 'bronce', PLATA: 'plata', ORO: 'oro' } as const;

/** Media de la carta en una pastilla con su metal y el nivel en texto (U5, U6); sin carta, "—". */
function PastillaMedia({ carta }: { carta: MiCarta | undefined }) {
  const { colores, metales, espacio, medidas } = useTema();
  const nivel = carta?.nivel ?? null;
  const metal = nivel ? metales[metalDe[nivel]] : null;

  return (
    <View
      testID={metal ? 'barra-media' : 'barra-sin-media'}
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: espacio.xxs,
        paddingHorizontal: espacio.xs,
        borderRadius: medidas.radio,
        overflow: 'hidden',
        backgroundColor: metal ? undefined : colores.superficie2,
      }}
    >
      {metal && <DegradadoMetal metal={metal} />}
      <Texto variante="cuerpoFuerte" color="textoTenue" colorDato={metal?.texto}>
        {carta?.media != null ? String(carta.media) : '—'}
      </Texto>
      {nivel && (
        <Texto variante="etiqueta" colorDato={metal?.texto}>
          {textoNivel[nivel]}
        </Texto>
      )}
    </View>
  );
}

interface Props {
  /** En S09 la barra no navega (ya estás en tu perfil, R3). */
  enPerfil?: boolean;
}

/**
 * Barra superior de las 4 pantallas raíz (F25 R1–R5): foto y nombre a la izquierda; racha, media
 * y escudo a la derecha. Toda la barra lleva a S09. Sin consultas nuevas: usa las de S09 con la
 * misma caché (R4). No muestra errores: se queda con lo que sí cargó.
 */
export function BarraSuperior({ enPerfil = false }: Props) {
  const { colores, espacio, medidas, tipografia } = useTema();
  const perfil = useMiPerfil();
  const racha = useMiRacha();
  const carta = useMiCarta();
  // En S09 ya las vuelven a pedir sus secciones al regresar a la pestaña. Estable entre renders:
  // si cambiara en cada uno, el efecto de foco se repetiría sin parar.
  const { refetch: releerPerfil } = perfil;
  const { refetch: releerRacha } = racha;
  const { refetch: releerCarta } = carta;
  const releer = useCallback(() => {
    if (enPerfil) return;
    void releerPerfil();
    void releerRacha();
    void releerCarta();
  }, [enPerfil, releerPerfil, releerRacha, releerCarta]);
  useReleerAlVolver(releer);

  const nombre = perfil.data?.nombre ?? '';
  const equipo = perfil.data?.equipo ?? null;
  const rachaActual = racha.data?.racha_actual;
  const media = carta.data?.media ?? null;
  const nivel = carta.data?.nivel ?? null;
  const cargando = perfil.isPending;

  // R3, con el nivel junto a la media (U5); mientras la carta no llega, no dice nada de ella.
  let textoMedia: string | null = null;
  if (carta.data) textoMedia = media !== null && nivel ? `media ${media}, ${textoNivel[nivel]}` : 'sin media';
  const etiqueta = [
    `Tu perfil: ${nombre || 'sin nombre'}`,
    rachaActual !== undefined ? `racha ${rachaActual}` : null,
    textoMedia,
    equipo?.nombre_corto ?? null,
  ]
    .filter(Boolean)
    .join(', ');

  // Pastilla vacía del mismo alto mientras carga (Estados).
  const pastillaCargando = (
    <View
      testID="barra-pastilla-cargando"
      style={{
        width: medidas.areaTactil,
        height: tipografia.cuerpoFuerte.lineHeight,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
      }}
    />
  );

  const contenido: ReactNode = cargando ? (
    <>
      <View
        testID="barra-cargando"
        style={{
          width: medidas.fotoLista,
          height: medidas.fotoLista,
          borderRadius: medidas.fotoLista / 2,
          backgroundColor: colores.superficie,
        }}
      />
      <View style={{ flex: 1 }}>
        <Esqueleto variante="cuerpoFuerte" ancho="50%" />
      </View>
      {pastillaCargando}
      {pastillaCargando}
    </>
  ) : (
    <>
      <FotoUsuario url={perfil.data?.foto_url ?? null} nombre={nombre} />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte" numberOfLines={1} ellipsizeMode="tail">
          {nombre}
        </Texto>
      </View>
      {rachaActual !== undefined && (
        <View testID="barra-racha" style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.xxs }}>
          <Icono nombre="llama" color="texto2" />
          <Texto variante="cuerpoFuerte">{String(rachaActual)}</Texto>
        </View>
      )}
      {carta.isPending ? pastillaCargando : <PastillaMedia carta={carta.data} />}
      {equipo && <EscudoEquipo equipo={equipo} tamano="escudoLista" />}
    </>
  );

  const estilo = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    minHeight: medidas.areaTactil,
    paddingHorizontal: medidas.margenPantalla,
    paddingVertical: espacio.xs,
    borderBottomWidth: medidas.linea,
    borderBottomColor: colores.linea,
  } as const;

  if (enPerfil) {
    return (
      <View testID="barra-superior" accessible accessibilityLabel={etiqueta} style={estilo}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      testID="barra-superior"
      onPress={() => router.navigate('/perfil')}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Ir a tu perfil"
      style={({ pressed }) => ({ ...estilo, opacity: pressed ? medidas.opacidadPresionado : 1 })}
    >
      {contenido}
    </Pressable>
  );
}
