import { PantallaProvisional } from '../provisional/PantallaProvisional';

export default function Login() {
  return (
    <PantallaProvisional
      id="S01"
      titulo="Inicio de sesión"
      enlaces={[{ titulo: 'Inicio', href: '/inicio' }]}
    />
  );
}
