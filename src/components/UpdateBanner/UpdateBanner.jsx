// Shows "A new version is available" when a newer build has been deployed, so nobody keeps using a stale copy.
import { useEffect, useState } from 'react';
import './UpdateBanner.css';

const CURRENT = typeof __BUILD_ID__ === 'undefined' ? null : __BUILD_ID__;

export default function UpdateBanner() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!CURRENT) return undefined;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return;
        const { build } = await r.json();
        if (build && build !== CURRENT) setStale(true);
      } catch { /* offline: try again later */ }
    };
    check();
    const t = setInterval(check, 60000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  if (!stale) return null;
  return (
    <div className="upd" role="status">
      <i className="ti ti-sparkles" />
      <span>A new version is available</span>
      <button onClick={() => window.location.reload()}>Update now</button>
      <button className="upd__x" aria-label="Later" onClick={() => setStale(false)}>Later</button>
    </div>
  );
}
