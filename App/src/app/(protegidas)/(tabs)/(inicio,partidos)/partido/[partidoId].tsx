import { useLocalSearchParams } from 'expo-router';

import { PantallaProvisional } from '../../../../../provisional/PantallaProvisional';

export default function Partido() {
  const { partidoId } = useLocalSearchParams<'/partido/[partidoId]'>();

  return (
    <PantallaProvisional
      id="S03"
      titulo="Partido"
      ubicacion="detallePestana"
      parametros={{ partidoId }}
    />
  );
}
