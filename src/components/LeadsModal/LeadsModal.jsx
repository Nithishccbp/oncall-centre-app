// Global Leads modal: header, dot pager, previous/next, lead card and missed footer.
import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import LeadCard from '../LeadCard/LeadCard.jsx';
import { useLeadsModal } from '../../context/LeadsModalContext.jsx';
import { leads } from '../../data/leads.js';
import { useIngest } from '../../context/IngestContext.jsx';
import './LeadsModal.css';

const ordered = leads; // same order as the mock: Mukunda first

export default function LeadsModal() {
  useIngest();
  const { open, startIndex, closeLeads } = useLeadsModal();
  const [idx, setIdx] = useState(0);
  const total = ordered.length;
  const lead = ordered[idx];
  const winBack = ordered.filter((l) => l.status !== 'Open').length;

  useEffect(() => { if (open) setIdx(startIndex); }, [open, startIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, total]);

  return (
    <Modal open={open} onClose={closeLeads} width={430} flush label="Leads">
      <div className="lm-head">
        <i className="ti ti-users lm-head__icon" />
        <div>
          <div className="lm-head__title">Leads</div>
          <div className="lm-head__sub">Lead {idx + 1} of {total} · time left to close</div>
        </div>
      </div>
      <div className="lm-pager">
        <button className="lm-nav" style={{ visibility: idx === 0 ? 'hidden' : 'visible' }} onClick={() => setIdx(idx - 1)} aria-label="Previous lead"><i className="ti ti-chevron-left" /></button>
        <div className="lm-dots" aria-hidden="true">
          {ordered.map((l, i) => <span key={l.id} className={i === idx ? 'is-on' : ''} />)}
        </div>
        <button className="lm-nav" style={{ visibility: idx === total - 1 ? 'hidden' : 'visible' }} onClick={() => setIdx(idx + 1)} aria-label="Next lead"><i className="ti ti-chevron-right" /></button>
      </div>
      <div className="lm-scroll"><LeadCard lead={lead} key={lead.id} /></div>
      {winBack > 0 && (
        <div className="lm-footer">
          <span className="lm-footer__dot" />
          <b>{winBack} TO WIN BACK</b> · still worth a call, we'll help
        </div>
      )}
    </Modal>
  );
}
