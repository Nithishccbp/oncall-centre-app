// Loads the Today-family data once and shares it with Today / Calls to make / Incoming / Recent.
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { fetchB2B, type B2BData } from '../../data/b2b';
import './Today.css';

export default function AvcLayout() {
  const [d, setD] = useState<B2BData | null>(null); const [err, setErr] = useState('');
  useEffect(() => { fetchB2B().then(setD).catch((e: Error) => setErr(e.message)); }, []);
  if (err) return <div className="avc"><div className="card" style={{ padding: 16 }}>Could not load. {err}</div></div>;
  if (!d) return <div className="avc" style={{ color: '#8a8378' }}>Loading…</div>;
  return <div className="avc"><Outlet context={d} /></div>;
}
