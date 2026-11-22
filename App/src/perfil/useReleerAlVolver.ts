import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Vuelve a pedir los datos cada vez que se regresa a la pantalla (la pestaña sigue montada al
 * cambiar a otra). La primera vez no: ya los pide `useQuery` al montarse (patrón de F13 R7).
 */
export function useReleerAlVolver(releer: () => unknown) {
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      void releer();
    }, [releer]),
  );
}
