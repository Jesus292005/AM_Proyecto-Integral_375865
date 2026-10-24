import { useLocalSearchParams } from 'expo-router';

import { PantallaProvisional } from '../../../../provisional/PantallaProvisional';

export default function Partidos() {
  const { jornada } = useLocalSearchParams<'/partidos'>();

  return (
    <PantallaProvisional
      id="S02"
      titulo="Partidos"
      ubicacion="raizPestana"
      parametros={{ jornada: typeof jornada === 'string' ? jornada : undefined }}
      enlaces={[
        { titulo: 'Partido 1', href: '/partido/1' },
        { titulo: 'Jornada 2', href: '/partidos?jornada=2' },
      ]}
    />
  );
}
