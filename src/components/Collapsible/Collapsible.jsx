// Section with a clickable header that opens/closes its body.
import { useState } from 'react';
import './Collapsible.css';

export default function Collapsible({ title, icon, defaultOpen = false, tone = 'grey', children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`collapsible collapsible--${tone}`}>
      <button className="collapsible__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="collapsible__title">{icon && <i className={`ti ${icon}`} />} {title}</span>
        <i className={`ti ti-chevron-down collapsible__chev ${open ? 'is-open' : ''}`} />
      </button>
      <div className={`collapsible__body ${open ? 'is-open' : ''}`}>
        <div className="collapsible__inner">{children}</div>
      </div>
    </section>
  );
}
