import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Boton, CampoTexto, Texto } from '../componentes';
import { PantallaModal } from './PantallaModal';
import { useUnirseAGrupo } from './useUnirseAGrupo';

// `ABCD-EFGH`: 8 caracteres y el guion opcional (F07 R2).
const MAXIMO = 9;

/** S06: unirse con el código del grupo; si llega `codigo` en la ruta, el campo aparece lleno. */
export function PantallaUnirse() {
  const { codigo: codigoRuta } = useLocalSearchParams<'/grupos/unirse'>();
  const [codigo, setCodigo] = useState(typeof codigoRuta === 'string' ? codigoRuta.toUpperCase() : '');
  const { unirse, uniendo, error, limpiarError } = useUnirseAGrupo();

  // Al volver de S07 con un código leído (F12), la ruta cambia sin montar la pantalla de nuevo:
  // el campo se actualiza durante el render (sin efecto).
  const [codigoRutaPrevio, setCodigoRutaPrevio] = useState(codigoRuta);
  if (codigoRuta !== codigoRutaPrevio) {
    setCodigoRutaPrevio(codigoRuta);
    if (typeof codigoRuta === 'string') setCodigo(codigoRuta.toUpperCase());
  }

  function cambiar(valor: string) {
    setCodigo(valor.toUpperCase());
    limpiarError();
  }

  return (
    <PantallaModal titulo="Unirse a grupo">
      <Texto variante="cuerpo" color="texto2">
        Pide el código a alguien del grupo.
      </Texto>
      <CampoTexto
        valor={codigo}
        onCambiar={cambiar}
        etiqueta="Código del grupo"
        placeholder="ABCD-EFGH"
        maximo={MAXIMO}
        mayusculas
        deshabilitado={uniendo}
        error={error}
      />
      <Boton
        titulo="Unirse"
        onPress={() => unirse(codigo)}
        deshabilitado={codigo.trim() === ''}
        cargando={uniendo}
      />
      <Boton
        titulo="Escanear QR"
        variante="secundario"
        onPress={() => router.navigate('/grupos/escanear')}
        deshabilitado={uniendo}
      />
    </PantallaModal>
  );
}
