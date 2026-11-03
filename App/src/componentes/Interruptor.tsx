import { Switch } from 'react-native';

import { useTema } from '../tema';

interface Props {
  valor: boolean;
  onCambiar: (valor: boolean) => void;
  /** Siempre obligatorio: el interruptor no tiene texto propio. */
  etiqueta: string;
  deshabilitado?: boolean;
}

/** El `Switch` del sistema con colores de tokens: activo `acento`, inactivo `linea` (05-ui §5). */
export function Interruptor({ valor, onCambiar, etiqueta, deshabilitado = false }: Props) {
  const { colores } = useTema();

  return (
    <Switch
      value={valor}
      onValueChange={onCambiar}
      disabled={deshabilitado}
      accessibilityLabel={etiqueta}
      trackColor={{ false: colores.linea, true: colores.acento }}
      thumbColor={colores.texto}
      ios_backgroundColor={colores.linea}
    />
  );
}
