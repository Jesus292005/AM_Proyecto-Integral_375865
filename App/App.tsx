// PROVISIONAL (T08): muestra de la guía visual para validarla en el teléfono.
// Se reemplaza por Expo Router en T03.
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Boton, Texto } from './src/componentes';
import { ProveedorTema, useFuentesApp, useTema, type VarianteTexto } from './src/tema';

SplashScreen.preventAutoHideAsync();

const variantes: VarianteTexto[] = [
  'titulo1',
  'titulo2',
  'numero',
  'pestana',
  'cuerpo',
  'cuerpoFuerte',
  'cita',
  'etiqueta',
  'meta',
  'menu',
];

function Muestra() {
  const { colores, espacio, medidas } = useTema();
  const [cargando, setCargando] = useState(false);

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: medidas.margenPantalla, gap: espacio.m }}
    >
      <Texto variante="etiqueta" color="textoTenue">
        Guía visual · muestra provisional
      </Texto>
      <Texto variante="marcadorXL">2-1</Texto>
      {variantes.map((v) => (
        <Texto key={v} variante={v}>
          {v} Campeón de Sillón 0123
        </Texto>
      ))}
      <View style={{ gap: espacio.s }}>
        <Boton titulo="Predecir" onPress={() => setCargando(true)} cargando={cargando} />
        <Boton titulo="Reintentar" variante="secundario" onPress={() => setCargando(false)} />
        <Boton titulo="Deshabilitado" deshabilitado onPress={() => undefined} />
      </View>
    </ScrollView>
  );
}

export default function App() {
  const fuentesListas = useFuentesApp();

  useEffect(() => {
    if (fuentesListas) SplashScreen.hideAsync();
  }, [fuentesListas]);

  if (!fuentesListas) return null;

  return (
    <ProveedorTema>
      <StatusBar style="light" />
      <Muestra />
    </ProveedorTema>
  );
}
