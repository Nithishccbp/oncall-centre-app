// Lets any screen open the global Leads modal.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const Ctx = createContext<LeadsModalCtx | null>(null);

function useLeadsModalValue() {
  const [state, setState] = useState<any>({ open: false, startIndex: 0 });
  const openLeads = useCallback((startIndex = 0) => setState({ open: true, startIndex }), []);
  const closeLeads = useCallback(() => setState((s: any) => ({ ...s, open: false })), []);
  const value = useMemo(() => ({ ...state, openLeads, closeLeads }), [state, openLeads, closeLeads]);
  return value;
}

export type LeadsModalCtx = ReturnType<typeof useLeadsModalValue>;
export function LeadsModalProvider({ children }: { children: ReactNode }) {
  const value = useLeadsModalValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLeadsModal = (): LeadsModalCtx => useContext(Ctx) as LeadsModalCtx;
