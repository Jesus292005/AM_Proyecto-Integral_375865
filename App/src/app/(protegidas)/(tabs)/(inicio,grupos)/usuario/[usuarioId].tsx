import { useLocalSearchParams } from 'expo-router';

import { PantallaProvisional } from '../../../../../provisional/PantallaProvisional';

export default function Usuario() {
  const { usuarioId } = useLocalSearchParams<'/usuario/[usuarioId]'>();

  return (
    <PantallaProvisional
      id="S13"
      titulo="Perfil de usuario"
      ubicacion="detallePestana"
      parametros={{ usuarioId }}
    />
  );
}
