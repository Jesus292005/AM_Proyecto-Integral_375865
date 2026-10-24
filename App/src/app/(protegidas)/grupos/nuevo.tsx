import { PantallaProvisional } from '../../../provisional/PantallaProvisional';

export default function NuevoGrupo() {
  return (
    <PantallaProvisional
      id="S05"
      titulo="Crear grupo"
      enlaces={[{ titulo: 'Grupo 1 (al crear)', href: '/(protegidas)/(tabs)/(grupos)/grupo/1' }]}
    />
  );
}
