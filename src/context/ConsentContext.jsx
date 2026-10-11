// Recording-consent state for the current call (DPDP-style): ask first, log everything.
// status: none (not asked yet) | pending (request sent) | recording | declined | withdrawn
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const Ctx = createContext(null);
const STORE_KEY = 'og_consent_events';
const initial = { status: 'none', consentId: null, callRef: null, method: null, offers: false, minor: false, language: 'en', log: [] };

const stamp = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(initial);
  const counters = useRef({ consent: 100501, call: 88421, dpo: 3001 });
  const latest = useRef(initial);
  latest.current = consent; // always the newest state, readable inside callbacks

  const persist = (entry) => {
    try {
      const all = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      localStorage.setItem(STORE_KEY, JSON.stringify([...all, entry].slice(-100)));
    } catch { /* ignore blocked storage */ }
  };

  const addLog = useCallback((secs, text, extra = {}) => {
    const entry = { at: stamp(secs), text, ts: new Date().toISOString(), ...extra };
    persist(entry);
    setConsent((c) => ({ ...c, log: [entry, ...c.log] }));
  }, []);

  /** Called when a new call connects. */
  const begin = useCallback(() => {
    const callRef = `CALL-2026-${counters.current.call++}`;
    setConsent({ ...initial, callRef });
  }, []);

  const setField = useCallback((patch) => setConsent((c) => ({ ...c, ...patch })), []);

  const sendRequest = useCallback((secs, channel) => {
    setConsent((c) => ({ ...c, status: 'pending', method: channel }));
    addLog(secs, 'Consent request sent on WhatsApp. Waiting for a tap.');
  }, [addLog]);

  const grant = useCallback((secs, method) => {
    const c = latest.current;
    const consentId = `CNS-2026-${counters.current.consent++}`;
    setConsent((cur) => ({ ...cur, status: 'recording', consentId, method }));
    const how = method === 'Verbal' ? 'said out loud (clip saved)' : 'tapped on WhatsApp';
    addLog(secs, `Consent ${consentId}: recording yes, ${how}. Offers ${c.offers ? 'asked together' : 'asked separately'}. Tied to ${c.callRef}.`);
    return consentId;
  }, [addLog]);

  const refuse = useCallback((secs, why = 'said no') => {
    setConsent((c) => ({ ...c, status: 'declined' }));
    addLog(secs, `Recording no (${why}). Call continues without recording. Logged against ${latest.current.callRef}.`);
  }, [addLog]);

  const withdraw = useCallback((secs) => {
    setConsent((c) => ({ ...c, status: 'withdrawn' }));
    addLog(secs, 'Consent withdrawn (Sec 6). Recording stopped.');
  }, [addLog]);

  const rightsRequest = useCallback((secs, title, sec) => {
    const ref = `DPO-2026-${counters.current.dpo++}`;
    addLog(secs, `${title} (${sec}) sent to the DPO. Reference ${ref}.`);
    return ref;
  }, [addLog]);

  const reset = useCallback(() => setConsent(initial), []);

  const value = useMemo(() => ({
    consent, begin, setField, sendRequest, grant, refuse, withdraw, rightsRequest, addLog, reset,
    recording: consent.status === 'recording',
  }), [consent, begin, setField, sendRequest, grant, refuse, withdraw, rightsRequest, addLog, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useConsent = () => useContext(Ctx);
