// Chat threads + pinned "Needs your input" tasks, kept in state so they survive navigation.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { threads as seedThreads, needsInput } from '../data/pulse.js';

const Ctx = createContext(null);
const clock = () => {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'am' : 'pm'}`;
};

export function PulseProvider({ children }) {
  const [threads, setThreads] = useState(seedThreads);
  const [answered, setAnswered] = useState({}); // taskId -> answer text

  const addMessage = useCallback((threadId, msg) => {
    setThreads((all) => {
      const t = all[threadId];
      if (!t) return all;
      const message = { id: `${threadId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time: clock(), ...msg };
      return { ...all, [threadId]: { ...t, messages: [...t.messages, message] } };
    });
  }, []);

  const upsertThread = useCallback((id, thread) => setThreads((all) => ({ ...all, [id]: { ...(all[id] || {}), ...thread } })), []);

  const pendingFor = useCallback(
    (channelId) => (needsInput[channelId] || []).filter((t) => !(t.id in answered)),
    [answered],
  );

  const answer = useCallback((channelId, taskId, text) => {
    setAnswered((a) => ({ ...a, [taskId]: text }));
    addMessage(channelId, { who: 'You', initials: 'AR', mine: true, text });
  }, [addMessage]);

  const value = useMemo(() => ({
    threads, addMessage, upsertThread, pendingFor, answer, answered,
    totalPending: () => Object.keys(needsInput).reduce((n, k) => n + pendingFor(k).length, 0),
  }), [threads, addMessage, upsertThread, pendingFor, answer, answered]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePulse = () => useContext(Ctx);
