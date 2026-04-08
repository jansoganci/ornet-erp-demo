import { useState, useMemo } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Select } from '../../../components/ui';

export function QuickProviderSelect({ sim, companies = [], onUpdate, t }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const options = useMemo(() => {
    const rows = (companies || []).map((c) => ({ value: c.id, label: c.name }));
    return [{ value: '', label: t('list.quickEditNoCompany') }, ...rows];
  }, [companies, t]);

  const handleChange = async (e) => {
    const v = e.target.value;
    const newId = v === '' ? null : v;
    const current = sim.provider_company_id ?? null;
    if (newId === current) return;
    setSaving(true);
    try {
      await onUpdate(sim.id, { provider_company_id: newId });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
      <Select
        value={sim.provider_company_id ?? ''}
        onChange={handleChange}
        options={options}
        disabled={saving}
        size="sm"
        wrapperClassName="!mb-0"
        className="min-w-[120px] max-w-[220px]"
      />
      {saving && <Loader2 className="h-4 w-4 animate-spin text-neutral-400 shrink-0" />}
      {saved && !saving && <Check className="h-4 w-4 text-green-500 shrink-0" />}
    </div>
  );
}
