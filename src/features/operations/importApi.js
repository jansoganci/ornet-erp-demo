import { supabase } from '../../lib/supabase';

const CHUNK_SIZE = 100;

export async function importOperationsItems(rows, { onProgress } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const total = rows.length;
  let created = 0;
  const errors = [];
  const results = [];

  onProgress?.({ current: 0, total });

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    try {
      const payload = chunk.map((row) => ({
        customer_id: row.customer_id ?? null,
        site_id: row.site_id ?? null,
        description: row.description,
        region: row.region,
        status: 'open',
        priority: row.priority ?? 'normal',
        work_type: row.work_type ?? 'other',
        created_by: user.id,
      }));

      const { data, error } = await supabase
        .from('operations_items')
        .insert(payload)
        .select('id');

      if (error) throw error;

      created += data?.length ?? payload.length;
      chunk.forEach((row) => {
        results.push({ rowNum: row.rowNum, status: 'created' });
      });
    } catch (error) {
      chunk.forEach((row) => {
        const message = error?.message || 'Unknown import error';
        errors.push({ row: row.rowNum, message });
        results.push({ rowNum: row.rowNum, status: 'failed', message });
      });
    }

    onProgress?.({ current: Math.min(i + chunk.length, total), total });
  }

  return {
    created,
    skipped: 0,
    failed: errors.length,
    errors,
    results,
  };
}
