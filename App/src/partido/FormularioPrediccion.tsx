import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Boton,
  CampoTexto,
  Opciones,
  PestanasTexto,
  Seccion,
  SelectorMarcador,
  Texto,
} from '../componentes';
import { useTema } from '../tema';
import {
  ErrorPrediccionesCerradas,
  guardarPrediccion,
  quitarPrediccion,
  type PartidoDetalle,
} from './datos';
import {
  eleccionDe,
  formularioInicial,
  JUSTIFICACION_MAXIMA,
  MARCADOR_MAXIMO,
  puedeGuardar,
  type EleccionPrediccion,
  type Formulario,
  type Pestana,
  type Prediccion,
  type RangoGoles,
  type Resultado,
} from './eleccion';
import { vibrar } from './vibracion';

const mensajes = {
  errorGuardar: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.',
  errorQuitar: 'No se pudo quitar. Revisa tu conexión e inténtalo de nuevo.',
  // F04 R5: sin puntos.
  ayudaAnalisis: 'Opcional. Si tu análisis se parece a lo que pase, ganas bono aunque falles.',
} as const;

const pestanas: readonly { valor: Pestana; titulo: string }[] = [
  { valor: 'resultadoGoles', titulo: 'Resultado y goles' },
  { valor: 'marcador', titulo: 'Marcador exacto' },
];

// D48.
const rangos: readonly { valor: RangoGoles; titulo: string }[] = [
  { valor: 'G0_1', titulo: '0–1' },
  { valor: 'G2', titulo: '2' },
  { valor: 'G3', titulo: '3' },
  { valor: 'G4_MAS', titulo: '4 o más' },
];

/** Claves de TanStack Query que dependen de mi predicción. */
export const clavesPrediccion = {
  mia: (partidoId: number) => ['mi-prediccion', partidoId] as const,
  // S02 muestra "Predicho" (CA9).
  jornadas: ['partidos-de-jornada'] as const,
};

interface Props {
  partido: PartidoDetalle;
  guardada: Prediccion | null;
  /** El servidor respondió `PREDICCIONES_CERRADAS` (F03 R6). */
  onCerrado: () => void;
  /** Se guardó (la predicción nueva) o se quitó (null): S03 decide si muestra la boleta (F24). */
  onTerminar: (nueva: Prediccion | null) => void;
  /** Solo al editar una guardada: vuelve a la boleta sin guardar (F24 R4). */
  onCancelar?: () => void;
}

/** Formulario de S03 antes del cierre (F03 Flujo 2–5); al editar, con "Cancelar" (F24 R4). */
export function FormularioPrediccion({
  partido,
  guardada,
  onCerrado,
  onTerminar,
  onCancelar,
}: Props) {
  const { espacio } = useTema();
  const clienteConsultas = useQueryClient();
  const [formulario, setFormulario] = useState<Formulario>(() => formularioInicial(guardada));
  const [falla, setFalla] = useState<string | null>(null);

  const alGuardarse = (nueva: Prediccion | null) => {
    clienteConsultas.setQueryData(clavesPrediccion.mia(partido.id), nueva);
    void clienteConsultas.invalidateQueries({ queryKey: clavesPrediccion.jornadas });
    setFalla(null);
  };
  const alFallar = (mensaje: string) => (error: Error) => {
    if (error instanceof ErrorPrediccionesCerradas) onCerrado();
    else setFalla(mensaje);
  };

  const guardar = useMutation({
    mutationFn: (eleccion: EleccionPrediccion) => guardarPrediccion(partido.id, eleccion),
    onSuccess: (nueva) => {
      vibrar('exito');
      alGuardarse(nueva);
      onTerminar(nueva);
    },
    onError: (error) => {
      // F24 R6: también si el servidor ya cerró el partido (F03 CA8).
      vibrar('error');
      alFallar(mensajes.errorGuardar)(error);
    },
  });
  const quitar = useMutation({
    mutationFn: () => quitarPrediccion(partido.id),
    onSuccess: () => {
      alGuardarse(null);
      guardar.reset();
      setFormulario(formularioInicial(null));
      onTerminar(null);
    },
    onError: alFallar(mensajes.errorQuitar),
  });

  const ocupado = guardar.isPending || quitar.isPending;
  const eleccion = eleccionDe(formulario);
  const cambiar = (cambios: Partial<Formulario>) => setFormulario((f) => ({ ...f, ...cambios }));

  function confirmarQuitar() {
    Alert.alert('¿Quitar tu predicción?', 'Se borra lo que elegiste para este partido.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => quitar.mutate() },
    ]);
  }

  const resultados: readonly { valor: Resultado; titulo: string }[] = [
    { valor: 'LOCAL', titulo: partido.local.nombre_corto },
    { valor: 'EMPATE', titulo: 'Empate' },
    { valor: 'VISITANTE', titulo: partido.visitante.nombre_corto },
  ];

  return (
    <View style={{ gap: espacio.xl }}>
      <Seccion etiqueta="Tu predicción">
        <PestanasTexto
          pestanas={pestanas}
          activa={formulario.pestana}
          onCambiar={(pestana) => cambiar({ pestana })}
          deshabilitado={ocupado}
        />
        {formulario.pestana === 'resultadoGoles' ? (
          <View style={{ gap: espacio.m }}>
            <View style={{ gap: espacio.xs }}>
              <Texto variante="etiqueta" color="textoTenue">
                Resultado
              </Texto>
              <Opciones
                nombre="Resultado"
                opciones={resultados}
                elegida={formulario.resultado}
                onElegir={(resultado) => cambiar({ resultado })}
                deshabilitado={ocupado}
              />
            </View>
            <View style={{ gap: espacio.xs }}>
              <Texto variante="etiqueta" color="textoTenue">
                Goles en total
              </Texto>
              <Opciones
                nombre="Goles en total"
                opciones={rangos}
                elegida={formulario.rango}
                onElegir={(rango) => cambiar({ rango })}
                deshabilitado={ocupado}
              />
            </View>
          </View>
        ) : (
          <SelectorMarcador
            local={{ nombre: partido.local.nombre_corto, goles: formulario.marcador.local }}
            visitante={{
              nombre: partido.visitante.nombre_corto,
              goles: formulario.marcador.visitante,
            }}
            maximo={MARCADOR_MAXIMO}
            onCambiar={(lado, goles) =>
              cambiar({ marcador: { ...formulario.marcador, [lado]: goles } })
            }
            deshabilitado={ocupado}
          />
        )}
      </Seccion>
      {/* F04: viaja con la predicción en la misma escritura (R6). */}
      <Seccion etiqueta="Tu análisis">
        <CampoTexto
          valor={formulario.justificacion}
          onCambiar={(justificacion) => cambiar({ justificacion })}
          etiqueta="Tu análisis"
          maximo={JUSTIFICACION_MAXIMA}
          placeholder="¿Por qué crees que pasará?"
          multilinea
          deshabilitado={ocupado}
        />
        <Texto variante="meta" color="textoTenue">
          {mensajes.ayudaAnalisis}
        </Texto>
      </Seccion>
      <View style={{ gap: espacio.s }}>
        <Boton
          titulo={guardada ? 'Actualizar' : 'Guardar predicción'}
          onPress={() => eleccion && guardar.mutate(eleccion)}
          deshabilitado={!puedeGuardar(formulario, guardada)}
          cargando={guardar.isPending}
        />
        {falla !== null && (
          <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
            {falla}
          </Texto>
        )}
        {onCancelar && (
          <Boton titulo="Cancelar" variante="secundario" onPress={onCancelar} deshabilitado={ocupado} />
        )}
        {guardada && (
          <Boton
            titulo="Quitar predicción"
            variante="secundario"
            onPress={confirmarQuitar}
            deshabilitado={guardar.isPending}
            cargando={quitar.isPending}
          />
        )}
      </View>
    </View>
  );
}
