import { router } from 'expo-router';

import { Boton } from '../../../componentes';
import { PantallaProvisional } from '../../../provisional/PantallaProvisional';

export default function Escanear() {
  return (
    <PantallaProvisional id="S07" titulo="Escanear QR">
      {/* Al leer un QR válido regresa a S06 con el código lleno (02-navigation §3). */}
      <Boton
        titulo="Simular lectura"
        variante="secundario"
        onPress={() =>
          router.dismissTo({ pathname: '/grupos/unirse', params: { codigo: 'ABC123' } })
        }
      />
    </PantallaProvisional>
  );
}
