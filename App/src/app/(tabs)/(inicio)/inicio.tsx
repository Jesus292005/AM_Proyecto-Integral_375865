import { PantallaProvisional } from '../../../provisional/PantallaProvisional';

export default function Inicio() {
  return (
    <PantallaProvisional
      id="S11"
      titulo="Inicio"
      ubicacion="raizPestana"
      enlaces={[
        { titulo: 'Partido 1', href: '/partido/1' },
        { titulo: 'Partidos', href: '/partidos' },
        { titulo: 'Grupo 1', href: '/grupo/1' },
        { titulo: 'Grupos', href: '/grupos' },
        { titulo: 'Equipo favorito', href: '/equipo' },
      ]}
    />
  );
}
