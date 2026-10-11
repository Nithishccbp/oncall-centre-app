// Generic modal rendered in a portal: overlay click, Esc and a close button all dismiss it.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

const stack = []; // open modals, topmost last — Esc only closes the top one

export default function Modal({ open, onClose, children, width = 480, flush = false, label = 'Dialog' }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol('modal');
    stack.push(id);
    const onKey = (e) => e.key === 'Escape' && stack[stack.length - 1] === id && onClose();
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); stack.splice(stack.indexOf(id), 1); };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={label}>
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        <div className={flush ? 'modal-body flush' : 'modal-body'}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
