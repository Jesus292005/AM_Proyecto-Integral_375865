import { View } from 'react-native';

import { useTema, type ColorGrupo } from '../tema';
import { Texto } from './Texto';

interface Props {
  nombre: string;
  /** Color resuelto por el servidor (F26 R2): el elegido o el de `id mod 8`. */
  color: ColorGrupo;
  /** `iconoGrupo` (44) en listas; `fotoPerfil` (72) en el encabezado de S08 y en S15. */
  tamano?: 'iconoGrupo' | 'fotoPerfil';
}

/** La inicial del nombre en mayúscula; si empieza con un número o un símbolo, ese carácter. */
export function inicialDeGrupo(nombre: string): string {
  return Array.from(nombre.trim())[0]?.toLocaleUpperCase('es-MX') ?? '?';
}

/**
 * Ícono de grupo (F26 R1, D104): círculo con el color del grupo y la inicial del nombre en Teko,
 * en el color "texto encima" de ese color. Sin fotos.
 */
export function IconoGrupo({ nombre, color, tamano = 'iconoGrupo' }: Props) {
  const { medidas, paletaGrupo } = useTema();
  const lado = medidas[tamano];
  const { fondo, texto } = paletaGrupo[color];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Grupo ${nombre}`}
      testID={`icono-grupo-${color}`}
      style={{
        width: lado,
        height: lado,
        borderRadius: lado / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fondo,
      }}
    >
      <Texto variante={tamano === 'fotoPerfil' ? 'titulo1' : 'titulo2'} colorDato={texto} numberOfLines={1}>
        {inicialDeGrupo(nombre)}
      </Texto>
    </View>
  );
}
