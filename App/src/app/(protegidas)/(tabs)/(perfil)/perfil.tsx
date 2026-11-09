import type { Enlace } from '../../../../provisional/PantallaProvisional';
import { PantallaProvisional } from '../../../../provisional/PantallaProvisional';
import { AjusteRecordatorios } from '../../../../perfil/AjusteRecordatorios';
import { SeccionRacha } from '../../../../perfil/SeccionRacha';
import { useMiRol } from '../../../../perfil/useMiRol';
import { BotonCerrarSesion } from '../../../../sesion/BotonCerrarSesion';

export default function Perfil() {
  const rol = useMiRol();
  const enlaces: Enlace[] = [{ titulo: 'Equipo favorito', href: '/equipo' }];
  // Solo administrador (F09 R1, D36); el servidor verifica el rol en cada operación.
  if (rol.data === 'ADMIN') enlaces.push({ titulo: 'Simulación', href: '/admin/simulacion' });

  return (
    <PantallaProvisional id="S09" titulo="Perfil" ubicacion="raizPestana" enlaces={enlaces}>
      <SeccionRacha />
      <AjusteRecordatorios />
      <BotonCerrarSesion />
    </PantallaProvisional>
  );
}
