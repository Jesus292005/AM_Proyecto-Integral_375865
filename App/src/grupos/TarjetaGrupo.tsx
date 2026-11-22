import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { IconoGrupo, Texto } from '../componentes';
import { useTema } from '../tema';
import type { MiGrupo } from './datos';
import { mensajesGrupo } from './errores';

export const textoMiembros = (n: number) => (n === 1 ? '1 miembro' : `${n} miembros`);

/** "Vas 2.º"; sin puntos en el grupo (nadie tiene) o sin torneo, "Sin puntos aún" (F26 R3). */
export const textoPosicion = (grupo: MiGrupo) =>
  grupo.mi_posicion === null || grupo.lideres === null ? mensajesGrupo.sinPuntosAun : `Vas ${grupo.mi_posicion}.º`;

/** El líder (F26 R3, R5): yo, otro, empate o nada si nadie tiene puntos. */
export function textoLider(grupo: MiGrupo): string | null {
  if (grupo.lideres === null || grupo.lider_nombre === null) return null;
  if (grupo.lideres > 1) return mensajesGrupo.empateLider;
  return grupo.lider_es_yo === true ? mensajesGrupo.vasLider : `Líder: ${grupo.lider_nombre}`;
}

/** Tarjeta de un grupo en S04 (F26 R3, U1): ícono, nombre, miembros, mi posición y el líder. */
export function TarjetaGrupo({ grupo }: { grupo: MiGrupo }) {
  const { colores, espacio, medidas } = useTema();
  const lider = textoLider(grupo);
  const detalle = `${textoMiembros(grupo.miembros)} · ${textoPosicion(grupo)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[grupo.nombre, detalle, lider].filter(Boolean).join(', ')}
      onPress={() => router.navigate({ pathname: '/grupo/[grupoId]', params: { grupoId: String(grupo.id) } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.s,
        padding: espacio.s,
        borderRadius: medidas.radio,
        backgroundColor: colores.superficie,
        opacity: pressed ? medidas.opacidadPresionado : 1,
      })}
    >
      <IconoGrupo nombre={grupo.nombre} color={grupo.color} />
      <View style={{ flex: 1, gap: espacio.xxs }}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {grupo.nombre}
        </Texto>
        <Texto variante="meta" color="texto2" numberOfLines={1}>
          {detalle}
        </Texto>
        {lider !== null && (
          <Texto variante="meta" color="textoTenue" numberOfLines={1}>
            {lider}
          </Texto>
        )}
      </View>
    </Pressable>
  );
}
