import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTema } from '../tema';
import { Texto } from './Texto';

interface Props {
  valor: string;
  onCambiar: (valor: string) => void;
  /** Nombre para lectores de pantalla (el campo no tiene caja ni título propio). */
  etiqueta: string;
  maximo: number;
  placeholder?: string;
  multilinea?: boolean;
  deshabilitado?: boolean;
  /** Mensaje de error: línea en `fallo` y el mensaje debajo (05-ui §5). */
  error?: string;
  /** Teclado en mayúsculas y sin autocorrección (códigos, F07). */
  mayusculas?: boolean;
}

/**
 * Campo sin caja: solo línea inferior y contador de caracteres (05-ui §5). La línea va en acento
 * al enfocar y en `fallo` con error; al llegar al máximo, el contador va en `fallo` y no admite
 * más texto.
 */
export function CampoTexto({
  valor,
  onCambiar,
  etiqueta,
  maximo,
  placeholder,
  multilinea = false,
  deshabilitado = false,
  error,
  mayusculas = false,
}: Props) {
  const { colores, espacio, medidas, tipografia } = useTema();
  const [enfocado, setEnfocado] = useState(false);
  const enLimite = valor.length >= maximo;
  const t = tipografia.cuerpo;
  let colorLinea = enfocado ? colores.acento : colores.linea;
  if (error !== undefined) colorLinea = colores.fallo;

  return (
    <View style={{ gap: espacio.xxs }}>
      <TextInput
        value={valor}
        onChangeText={onCambiar}
        maxLength={maximo}
        multiline={multilinea}
        editable={!deshabilitado}
        placeholder={placeholder}
        autoCapitalize={mayusculas ? 'characters' : 'sentences'}
        autoCorrect={!mayusculas}
        placeholderTextColor={colores.textoTenue}
        accessibilityLabel={etiqueta}
        accessibilityState={{ disabled: deshabilitado }}
        maxFontSizeMultiplier={medidas.escalaTextoMaxima}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        selectionColor={colores.acento}
        cursorColor={colores.acento}
        style={{
          color: deshabilitado ? colores.textoTenue : colores.texto,
          fontFamily: t.fontFamily,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          minHeight: medidas.areaTactil,
          paddingVertical: espacio.xs,
          paddingHorizontal: 0,
          textAlignVertical: 'top',
          borderBottomWidth: medidas.linea,
          borderBottomColor: colorLinea,
        }}
      />
      <View style={{ flexDirection: 'row', gap: espacio.s }}>
        <View style={{ flex: 1 }}>
          {error !== undefined && (
            <Texto variante="meta" color="fallo" accessibilityLiveRegion="polite">
              {error}
            </Texto>
          )}
        </View>
        <Texto variante="meta" color={enLimite ? 'fallo' : 'textoTenue'}>
          {`${valor.length}/${maximo}`}
        </Texto>
      </View>
    </View>
  );
}
