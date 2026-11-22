import { Tabs } from 'expo-router';

import { MenuInferior, type NombreIcono } from '../../../componentes';
import { useTema } from '../../../tema';

// Ícono de cada destino del menú (F22 R1).
const iconos: Record<string, NombreIcono> = {
  '(inicio)': 'casa',
  '(partidos)': 'calendario',
  '(grupos)': 'usuarios',
  '(perfil)': 'usuario',
};

function iconoDe(ruta: string): NombreIcono {
  const icono = iconos[ruta];
  // Una pestaña nueva sin ícono debe fallar en las pruebas, no salir con otro ícono.
  if (icono === undefined) throw new Error(`La pestaña ${ruta} no tiene ícono (F22 R1).`);
  return icono;
}

export default function LayoutPestanas() {
  const { colores } = useTema();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
      tabBar={({ state, descriptors, navigation }) => {
        const activa = state.routes[state.index];
        return (
          <MenuInferior
            destinos={state.routes.map((r) => ({
              clave: r.key,
              etiqueta: descriptors[r.key]?.options.title ?? r.name,
              icono: iconoDe(r.name),
            }))}
            activo={activa?.key ?? ''}
            onSeleccionar={(clave) => {
              const ruta = state.routes.find((r) => r.key === clave);
              if (!ruta) return;
              const evento = navigation.emit({
                type: 'tabPress',
                target: clave,
                canPreventDefault: true,
              });
              if (!evento.defaultPrevented && clave !== activa?.key) {
                navigation.navigate(ruta.name, ruta.params);
              }
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="(inicio)" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="(partidos)" options={{ title: 'Partidos' }} />
      <Tabs.Screen name="(grupos)" options={{ title: 'Grupos' }} />
      <Tabs.Screen name="(perfil)" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
