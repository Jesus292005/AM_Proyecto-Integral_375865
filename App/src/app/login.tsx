import { Redirect } from 'expo-router';

import { PantallaProvisional } from '../provisional/PantallaProvisional';
import { useSesion } from '../sesion/ProveedorSesion';

export default function Login() {
  const { estado, destino } = useSesion();

  if (estado.tipo === 'cargando') return null;
  // Con sesión, S01 no se muestra: se continúa a la ruta pedida o a Inicio (F01 §5.7, CA8).
  if (estado.tipo === 'conSesion') return <Redirect href={destino ?? '/inicio'} />;

  return <PantallaProvisional id="S01" titulo="Inicio de sesión" />;
}
