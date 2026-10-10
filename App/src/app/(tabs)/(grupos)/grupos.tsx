import { PantallaProvisional } from '../../../provisional/PantallaProvisional';

export default function Grupos() {
  return (
    <PantallaProvisional
      id="S04"
      titulo="Grupos"
      ubicacion="raizPestana"
      enlaces={[
        { titulo: 'Crear grupo', href: '/grupos/nuevo' },
        { titulo: 'Unirse', href: '/grupos/unirse' },
        { titulo: 'Grupo 1', href: '/grupo/1' },
      ]}
    />
  );
}
