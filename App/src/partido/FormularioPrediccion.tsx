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
import { formatearHora } from '../formato/fechas';
import { aceptarRecordatorios, debePreguntar } from '../notificaciones/registro';
import { guardarAhoraNo } from '../notificaciones/sistema';
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

const mensajes = {
  errorGuardar: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.',
  errorQuitar: 'No se pudo quitar. Revisa tu conexión e inténtalo de nuevo.',
  // F11a R1.
  preguntaRecordatorios: '¿Te avisamos 1 h antes de que cierren los partidos que no has predicho?',
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
}

/** Formulario de S03 antes del cierre (F03 Flujo 2–5). */
export function FormularioPrediccion({ partido, guardada, onCerrado }: Props) {
  const { colores, espacio, medidas } = useTema();
  const clienteConsultas = useQueryClient();
  const [formulario, setFormulario] = useState<Formulario>(() => formularioInicial(guardada));
  const [falla, setFalla] = useState<string | null>(null);
  // F11a R1: la explicación previa al permiso, solo después de guardar.
  const [preguntar, setPreguntar] = useState(false);

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
      alGuardarse(nueva);
      debePreguntar()
        .then(setPreguntar)
        .catch((error: unknown) => console.warn('[notificaciones] No se leyó el permiso', error));
    },
    onError: alFallar(mensajes.errorGuardar),
  });
  const quitar = useMutation({
    mutationFn: () => quitarPrediccion(partido.id),
    onSuccess: () => {
      alGuardarse(null);
      guardar.reset();
      setFormulario(formularioInicial(null));
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
        {guardar.isSuccess && falla === null && (
          <Texto variante="meta" color="textoTenue" accessibilityLiveRegion="polite">
            {`Predicción guardada · ${formatearHora(new Date(guardar.data.actualizada_en))}`}
          </Texto>
        )}
        {preguntar && (
          <View
            accessibilityRole="alert"
            style={{
              gap: espacio.s,
              padding: espacio.m,
              borderRadius: medidas.radio,
              backgroundColor: colores.superficie,
            }}
          >
            <Texto variante="cuerpo">{mensajes.preguntaRecordatorios}</Texto>
            <Boton
              titulo="Sí, avísame"
              onPress={() => {
                setPreguntar(false);
                aceptarRecordatorios().catch((error: unknown) =>
                  console.warn('[notificaciones] No se activaron los recordatorios', error),
                );
              }}
            />
            <Boton
              titulo="Ahora no"
              variante="secundario"
              onPress={() => {
                setPreguntar(false);
                void guardarAhoraNo();
              }}
            />
          </View>
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
