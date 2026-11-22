import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Boton,
  CampoTexto,
  Esqueleto,
  EstadoPantalla,
  Icono,
  IconoGrupo,
  PantallaModal,
  Texto,
} from '../componentes';
import { esSinConexion } from '../datos/errores';
import { COLORES_GRUPO, useTema, type ColorGrupo } from '../tema';
import { editarGrupo, obtenerGrupo, type GrupoDetalle } from './datos';
import { mensajeAlEditar, mensajesGrupo } from './errores';

// F07 R1: de 3 a 30 caracteres después de recortar; el servidor vuelve a validar.
const MAXIMO = 30;
const MINIMO = 3;

/** Nombre de cada color para el lector de pantalla (U5: el color nunca va solo). */
const nombresColor: Record<ColorGrupo, string> = {
  ROJO: 'Rojo',
  AMARILLO: 'Amarillo',
  VERDE: 'Verde',
  TURQUESA: 'Turquesa',
  AZUL: 'Azul',
  MORADO: 'Morado',
  ROSA: 'Rosa',
  CAFE: 'Café',
};

function cerrar(grupoId: number) {
  if (router.canGoBack()) router.back();
  else router.navigate({ pathname: '/grupo/[grupoId]', params: { grupoId: String(grupoId) } });
}

/** Los 8 colores de la paleta (F26 R2); el elegido con borde `acento` y check (U5). */
function Paleta({ elegido, onElegir }: { elegido: ColorGrupo; onElegir: (color: ColorGrupo) => void }) {
  const { colores, espacio, medidas, paletaGrupo } = useTema();

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
      {COLORES_GRUPO.map((color) => {
        const activo = color === elegido;
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={nombresColor[color]}
            accessibilityState={{ selected: activo }}
            onPress={() => onElegir(color)}
            style={{
              width: medidas.iconoGrupo,
              height: medidas.iconoGrupo,
              borderRadius: medidas.iconoGrupo / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: paletaGrupo[color].fondo,
              borderWidth: medidas.barraActiva,
              borderColor: activo ? colores.acento : paletaGrupo[color].fondo,
            }}
          >
            {activo && <Icono nombre="check" colorDato={paletaGrupo[color].texto} tamano="iconoMenu" />}
          </Pressable>
        );
      })}
    </View>
  );
}

function Formulario({ grupo }: { grupo: GrupoDetalle }) {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const [nombre, setNombre] = useState(grupo.nombre);
  const [color, setColor] = useState<ColorGrupo>(grupo.color);
  const guardar = useMutation({
    mutationFn: ({ limpio, elegido }: { limpio: string; elegido: ColorGrupo }) =>
      editarGrupo(grupo.id, limpio, elegido),
    onSuccess: (_nada, { limpio, elegido }) => {
      clienteConsultas.setQueryData<GrupoDetalle | null>(
        ['grupo', grupo.id],
        (antes) => antes && { ...antes, nombre: limpio, color: elegido },
      );
      void clienteConsultas.invalidateQueries({ queryKey: ['grupo', grupo.id] });
      void clienteConsultas.invalidateQueries({ queryKey: ['mis-grupos'] });
      cerrar(grupo.id);
    },
  });

  const limpio = nombre.trim();
  const valido = limpio.length >= MINIMO && limpio.length <= MAXIMO;
  const sinCambios = limpio === grupo.nombre && color === grupo.color;

  let error: string | undefined;
  if (guardar.error) error = mensajeAlEditar(guardar.error);
  else if (limpio !== '' && !valido) error = mensajesGrupo.nombreInvalido;

  return (
    <>
      <View style={{ alignItems: 'center' }}>
        <IconoGrupo nombre={limpio === '' ? grupo.nombre : limpio} color={color} tamano="fotoPerfil" />
      </View>
      <CampoTexto
        valor={nombre}
        onCambiar={(valor) => {
          setNombre(valor);
          if (guardar.isError) guardar.reset();
        }}
        etiqueta="Nombre del grupo"
        placeholder="Nombre del grupo"
        maximo={MAXIMO}
        deshabilitado={guardar.isPending}
        error={error}
      />
      <View style={{ gap: espacio.s }}>
        <Texto variante="etiqueta" color="textoTenue">
          Color
        </Texto>
        <Paleta
          elegido={color}
          onElegir={(elegido) => {
            setColor(elegido);
            if (guardar.isError) guardar.reset();
          }}
        />
      </View>
      <Boton
        titulo="Guardar"
        onPress={() => guardar.mutate({ limpio, elegido: color })}
        deshabilitado={!valido || sinCambios}
        cargando={guardar.isPending}
      />
    </>
  );
}

/** S15: el `ADMIN` cambia el nombre y el color del grupo (F26 R6). */
export function PantallaEditarGrupo() {
  const { grupoId } = useLocalSearchParams<'/grupos/editar/[grupoId]'>();
  const id = Number(grupoId);
  const idValido = Number.isInteger(id) && id > 0;
  // La misma consulta y caché de S08.
  const grupo = useQuery({ queryKey: ['grupo', id], queryFn: () => obtenerGrupo(id), enabled: idValido });

  let contenido;
  if (!idValido || grupo.data === null) {
    contenido = (
      <EstadoPantalla
        mensaje={mensajesGrupo.noMiembro}
        accion={{ titulo: 'Ir a Grupos', onPress: () => router.navigate('/grupos') }}
      />
    );
  } else if (grupo.data !== undefined) {
    contenido =
      grupo.data.rol === 'ADMIN' ? (
        <Formulario grupo={grupo.data} />
      ) : (
        <EstadoPantalla mensaje={mensajesGrupo.noAdmin} />
      );
  } else if (grupo.isError) {
    contenido = (
      <EstadoPantalla
        mensaje={esSinConexion(grupo.error) ? mensajesGrupo.sinConexion : mensajesGrupo.errorGrupo}
        accion={{ titulo: 'Reintentar', onPress: () => void grupo.refetch() }}
      />
    );
  } else contenido = <Esqueleto variante="cuerpo" ancho="100%" />;

  return <PantallaModal titulo="Editar grupo">{contenido}</PantallaModal>;
}
