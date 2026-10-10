import { useLocalSearchParams } from 'expo-router';

import { PantallaProvisional } from '../../provisional/PantallaProvisional';

export default function Unirse() {
  const { codigo } = useLocalSearchParams<'/grupos/unirse'>();

  return (
    <PantallaProvisional
      id="S06"
      titulo="Unirse a grupo"
      parametros={{ codigo: typeof codigo === 'string' ? codigo : undefined }}
      enlaces={[
        { titulo: 'Escanear QR', href: '/grupos/escanear' },
        { titulo: 'Grupo 1 (al unirse)', href: '/(tabs)/(grupos)/grupo/1' },
      ]}
    />
  );
}
