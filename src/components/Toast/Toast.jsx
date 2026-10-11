// Small message at the top of the screen (consent recorded, saved to CRM, etc.).
import { useUi } from '../../context/UiContext.jsx';

export default function Toast() {
  const { toast } = useUi();
  if (!toast) return null;
  return <div key={toast.id} className="toast" role="status" aria-live="polite"><i className="ti ti-shield-check" /> {toast.text}</div>;
}
