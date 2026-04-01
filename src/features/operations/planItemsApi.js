import { supabase } from '../../lib/supabase';

export const planItemKeys = {
  all: ['plan_items'],
  byDate: (date) => [...planItemKeys.all, 'byDate', date],
  range: (dateFrom, dateTo) => [...planItemKeys.all, 'range', dateFrom, dateTo],
};

export async function fetchPlanItems(date) {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPlanItemsRange(dateFrom, dateTo) {
  let query = supabase
    .from('plan_items')
    .select('*')
    .order('plan_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (dateFrom) {
    query = query.gte('plan_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('plan_date', dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createPlanItem(planItemData) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('plan_items')
    .insert([{
      ...planItemData,
      created_by: user?.id,
    }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlanItemStatus(id, status) {
  const { data, error } = await supabase
    .from('plan_items')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function carryForwardPlanItem(id, newDate) {
  const { data: existing, error: fetchError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = existing;

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('plan_items')
    .insert([{
      ...rest,
      plan_date: newDate,
      status: 'pending',
      is_carried: true,
      source_plan_item_id: id,
      created_by: user?.id ?? existing.created_by,
    }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlanItem(id) {
  const { error } = await supabase
    .from('plan_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
