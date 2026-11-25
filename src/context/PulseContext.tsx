// Chat threads + pinned "Needs your input" tasks, kept in state so they survive navigation.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { threads as seedThreads, needsInput } from '../data/pulse';

const Ctx = createContext<PulseCtx | null>(null);
const clock = () => {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'am' : 'pm'}`;
};

function usePulseValue() {
  const [threads, setThreads] = useState(seedThreads);
  const [answered, setAnswered] = useState<any>({}); // taskId -> answer text

  const addMessage = useCallback((threadId: any, msg: any) => {
    setThreads((all) => {
      const t = all[threadId];
      if (!t) return all;
      const message = { id: `${threadId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time: clock(), ...msg };
      return { ...all, [threadId]: { ...t, messages: [...t.messages, message] } };
    });
  }, []);

  const upsertThread = useCallback((id: any, thread: any) => setThreads((all) => ({ ...all, [id]: { ...(all[id] || {}), ...thread } })), []);

  const pendingFor = useCallback(
    (channelId: any) => (needsInput[channelId] || []).filter((t) => !(t.id in answered)),
    [answered],
  );

  const answer = useCallback((channelId: any, taskId: any, text: any) => {
    setAnswered((a: any) => ({ ...a, [taskId]: text }));
    addMessage(channelId, { who: 'You', initials: 'AR', mine: true, text });
  }, [addMessage]);

  const value = useMemo(() => ({
    threads, addMessage, upsertThread, pendingFor, answer, answered,
    totalPending: () => Object.keys(needsInput).reduce((n, k) => n + pendingFor(k).length, 0),
  }), [threads, addMessage, upsertThread, pendingFor, answer, answered]);

  return value;
}

export type PulseCtx = ReturnType<typeof usePulseValue>;
export function PulseProvider({ children }: { children: ReactNode }) {
  const value = usePulseValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePulse = (): PulseCtx => useContext(Ctx) as PulseCtx;
