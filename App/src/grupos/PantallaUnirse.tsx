import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Boton, CampoTexto, Texto } from '../componentes';
import { tomarLectura } from './lecturaQR';
import { PantallaModal } from './PantallaModal';
import { useUnirseAGrupo } from './useUnirseAGrupo';

// `ABCD-EFGH`: 8 caracteres y el guion opcional (F07 R2).
const MAXIMO = 9;

/**
 * S06: unirse con el código del grupo. Si llega `codigo` en la ruta, el campo aparece lleno. Si
 * además viene de una lectura de S07 (F12 R4), se une una sola vez sin otro toque; un enlace
 * externo con los mismos parámetros solo llena el campo (D37, `lecturaQR`).
 */
export function PantallaUnirse() {
  const { codigo: codigoRuta, lectura } = useLocalSearchParams<'/grupos/unirse'>();
  const [codigo, setCodigo] = useState(typeof codigoRuta === 'string' ? codigoRuta.toUpperCase() : '');
  const { unirse, uniendo, error, limpiarError } = useUnirseAGrupo();

  // Al volver de S07, la ruta cambia sin montar la pantalla de nuevo: el campo se actualiza durante
  // el render (sin efecto). Cada lectura trae su número, así que volver a escanear el mismo QR
  // (por ejemplo, después de un error) vuelve a llenar el campo.
  const claveRuta = `${String(codigoRuta)}|${String(lectura)}`;
  const [claveRutaPrevia, setClaveRutaPrevia] = useState(claveRuta);
  if (claveRuta !== claveRutaPrevia) {
    setClaveRutaPrevia(claveRuta);
    if (typeof codigoRuta === 'string') setCodigo(codigoRuta.toUpperCase());
  }

  // F12 R4: la lectura de S07 se toma una sola vez (se une una vez por lectura).
  useEffect(() => {
    if (typeof codigoRuta !== 'string' || typeof lectura !== 'string') return;
    if (tomarLectura(codigoRuta, lectura)) unirse(codigoRuta);
  }, [codigoRuta, lectura, unirse]);

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
