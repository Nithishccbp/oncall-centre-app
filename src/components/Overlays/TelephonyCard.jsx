// Settings > Telephony: connect the brand's calling provider (Vobiz / Exotel / Ozonetel), activate numbers, pick the staff caller ID.
// Secrets are sent to our server once and never come back to the browser.
import { useEffect, useState } from 'react';
import { api } from '../../services/phoneCall.js';

const FIELDS = {
  vobiz: [['id', 'Auth ID', 'MA_XXXXXXXX'], ['token', 'Auth Secret', 'Auth token from the Vobiz console', true]],
  exotel: [['sid', 'Account SID', ''], ['key', 'API key', ''], ['token', 'API token', '', true], ['sub', 'Subdomain (optional)', 'api.exotel.com']],
  ozonetel: [['key', 'API key', ''], ['user', 'Username', ''], ['campaign', 'Campaign name', ''], ['agentId', 'Your agent ID', '']],
};
const NAMES = { vobiz: 'Vobiz', exotel: 'Exotel', ozonetel: 'Ozonetel' };
const ghost = { background: 'transparent', border: '1px solid var(--line, #cfd8d3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', font: 'inherit' };
const row = { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' };
const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line, #d8e0dc)', borderRadius: 8, font: 'inherit', marginBottom: 6 };

export default function TelephonyCard({ toast }) {
  const [t, setT] = useState(undefined);
  const [prov, setProv] = useState('vobiz');
  const [f, setF] = useState({});
  const [cid, setCid] = useState('');
  const [num, setNum] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = () => fetch('/api/telephony/config').then((r) => r.json()).then((d) => { setT(d.telephony); if (d.telephony?.provider && d.telephony.provider !== 'none') setProv(d.telephony.provider); }).catch(() => setT(false));
  useEffect(() => { load(); }, []);

  const post = async (path, body, ok) => {
    setBusy(true); setErr('');
    try { const r = await api(path, { method: 'POST', body: JSON.stringify(body) }); setT(r.telephony ?? undefined); if (!r.telephony) await load(); if (ok) toast(ok); return true; }
    catch (e) { setErr(e.message); return false; } finally { setBusy(false); }
  };
  const connect = async () => { if (await post('/api/telephony/save', { provider: prov, [prov]: f, callerId: cid || undefined, dids: cid ? [cid] : undefined }, `${NAMES[prov]} connected`)) setF({}); };

  if (t === undefined) return <div className="card set__row"><span><b>Checking telephony…</b></span></div>;
  if (t === false) return <div className="card set__row"><span><b>Telephony</b><small>Server not reachable here (works on the deployed site).</small></span></div>;
  const ready = t.ready;
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={row}><b>{ready ? `${NAMES[t.provider]} · connected` : 'Calling provider · not connected'}</b>{ready && <small className="muted">{t.authIdHint}</small>}</div>
      {!ready && (
        <>
          <small className="muted">Enter the details from your telephony provider. Staff calls will ring your phone first, then connect the customer.</small>
          <select style={{ ...inp, marginTop: 8 }} value={prov} onChange={(e) => { setProv(e.target.value); setF({}); }} aria-label="Provider">{Object.entries(NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          {FIELDS[prov].map(([k, label, ph, secret]) => <input key={k} style={inp} type={secret ? 'password' : 'text'} autoComplete="off" placeholder={`${label}${ph ? ` · ${ph}` : ''}`} aria-label={label} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
          {prov !== 'ozonetel' && <input style={inp} placeholder="Caller ID number (your DID) e.g. +918071582962" aria-label="Caller ID number" value={cid} onChange={(e) => setCid(e.target.value.replace(/[^\d+ ]/g, ''))} />}
          <button className="btn-primary" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect'}</button>
        </>
      )}
      {ready && (
        <>
          <div className="label-caps" style={{ marginTop: 8 }}>Activate numbers</div>
          {t.dids.map((d) => <div key={d} style={row}><span>{d}{d === t.callerId && <small className="muted"> · caller ID</small>}</span><button style={ghost} disabled={busy} onClick={() => post('/api/telephony/save', { dids: t.dids.filter((x) => x !== d), callerId: t.callerId === d ? '' : undefined })}>Remove</button></div>)}
          {!t.dids.length && <small className="muted">No numbers added yet.</small>}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input style={{ ...inp, marginBottom: 0 }} placeholder="+91… number from your provider" aria-label="Add number" value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d+ ]/g, ''))} />
            <button style={ghost} disabled={busy || !num} onClick={async () => { if (await post('/api/telephony/save', { dids: [...t.dids, num], callerId: t.callerId || num })) setNum(''); }}>Add</button>
          </div>
          {t.dids.length > 1 && (<><div className="label-caps" style={{ marginTop: 10 }}>Staff caller ID</div>
            <select style={inp} value={t.callerId || ''} onChange={(e) => post('/api/telephony/save', { callerId: e.target.value }, 'Caller ID updated')} aria-label="Staff caller ID">{t.dids.map((d) => <option key={d}>{d}</option>)}</select></>)}
          <button style={{ ...ghost, marginTop: 10 }} disabled={busy} onClick={() => window.confirm('Disconnect the calling provider?') && post('/api/telephony/disconnect', {}, 'Disconnected')}>Disconnect</button>
        </>
      )}
      {!t.canSave && <p className="pc__warn">Saving needs Upstash Redis connected in Vercel (Storage tab).</p>}
      {err && <p className="pc__warn">{err}</p>}
      {t.missing?.length > 0 && t.provider !== 'none' && !ready && <small className="muted">Missing: {t.missing.join(', ')}</small>}
    </div>
  );
}
