import { useEffect, useState } from 'react';

/** Hora del teléfono, actualizada cada segundo (contador "Cierra en", F03 R8). */
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  return ahora;
}
