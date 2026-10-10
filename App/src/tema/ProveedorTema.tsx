import { createContext, useContext, type ReactNode } from 'react';

import { temaGrafito, type Tema } from './tokens';

const ContextoTema = createContext<Tema>(temaGrafito);

interface Props {
  tema?: Tema;
  children: ReactNode;
}

export function ProveedorTema({ tema = temaGrafito, children }: Props) {
  return <ContextoTema.Provider value={tema}>{children}</ContextoTema.Provider>;
}

export function useTema(): Tema {
  return useContext(ContextoTema);
}
