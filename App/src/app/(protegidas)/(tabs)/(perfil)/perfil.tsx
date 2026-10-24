import { PantallaProvisional } from '../../../../provisional/PantallaProvisional';

export default function Perfil() {
  return (
    <PantallaProvisional
      id="S09"
      titulo="Perfil"
      ubicacion="raizPestana"
      enlaces={[
        { titulo: 'Equipo favorito', href: '/equipo' },
        // Solo administrador (D36): la restricción llega con F09.
        { titulo: 'Simulación', href: '/admin/simulacion' },
        { titulo: 'Inicio de sesión', href: '/login' },
      ]}
    />
  );
}
