// Lets any screen open the global Leads modal.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);

export function LeadsModalProvider({ children }) {
  const [state, setState] = useState({ open: false, startIndex: 0 });
  const openLeads = useCallback((startIndex = 0) => setState({ open: true, startIndex }), []);
  const closeLeads = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => ({ ...state, openLeads, closeLeads }), [state, openLeads, closeLeads]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLeadsModal = () => useContext(Ctx);
