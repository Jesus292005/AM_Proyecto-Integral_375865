import { useLocalSearchParams } from 'expo-router';

import { PantallaProvisional } from '../../../../provisional/PantallaProvisional';

export default function Grupo() {
  const { grupoId, vista } = useLocalSearchParams<'/grupo/[grupoId]'>();

  return (
    <PantallaProvisional
      id="S08"
      titulo="Grupo"
      ubicacion="detallePestana"
      parametros={{ grupoId, vista: typeof vista === 'string' ? vista : undefined }}
      enlaces={[
        { titulo: 'Usuario 1', href: '/usuario/1' },
        {
          titulo: 'Vista jornada',
          href: { pathname: '/grupo/[grupoId]', params: { grupoId, vista: 'jornada' } },
        },
      ]}
    />
  );
}
