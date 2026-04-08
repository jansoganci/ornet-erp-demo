import { useState, useEffect, useRef } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Input } from '../../../components/ui';

function toDateInputValue(raw) {
  if (!raw) return '';
  const s = String(raw);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Only persist full dates or clear; avoids partial values hitting the API. */
function isPersistableDateValue(v) {
  return v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function QuickActivationDateField({ sim, onUpdate, onDraftDirty }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState(() => toDateInputValue(sim.activation_date));
  const focusedRef = useRef(false);

  const serverVal = toDateInputValue(sim.activation_date);

  useEffect(() => {
    if (focusedRef.current) return;
    setLocal(serverVal);
  }, [sim.id, serverVal]);

  useEffect(() => {
    const dirty = local !== serverVal;
    onDraftDirty?.(sim.id, dirty);
    return () => onDraftDirty?.(sim.id, false);
  }, [local, serverVal, sim.id, onDraftDirty]);

  const commitIfChanged = async () => {
    if (!isPersistableDateValue(local)) return;
    const nextPayload = local === '' ? null : local;
    const prevPayload = serverVal === '' ? null : serverVal;
    if (nextPayload === prevPayload) return;

    setSaving(true);
    try {
      await onUpdate(sim.id, { activation_date: nextPayload });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
      <Input
        type="date"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commitIfChanged();
        }}
        disabled={saving}
        size="sm"
        wrapperClassName="!mb-0 w-[9.5rem] shrink-0"
        className="font-mono text-sm"
      />
      {saving && <Loader2 className="h-4 w-4 animate-spin text-neutral-400 shrink-0" />}
      {saved && !saving && <Check className="h-4 w-4 text-green-500 shrink-0" />}
    </div>
  );
}
