-- Migration: 00174_plan_items
-- Description: Add daily planning table for Operations V2

BEGIN;

CREATE TABLE public.plan_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date            DATE NOT NULL,
  description          TEXT NOT NULL,
  notes                TEXT,
  item_type            TEXT NOT NULL DEFAULT 'office'
                         CHECK (item_type IN ('field_work', 'office', 'proposal', 'finance', 'other')),
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'done', 'not_done')),
  is_carried           BOOLEAN NOT NULL DEFAULT false,
  source_plan_item_id  UUID REFERENCES public.plan_items(id) ON DELETE SET NULL,
  operations_item_id   UUID REFERENCES public.operations_items(id) ON DELETE SET NULL,
  work_order_id        UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  proposal_id          UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES public.profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pi_plan_date ON public.plan_items(plan_date);
CREATE INDEX idx_pi_operations_item ON public.plan_items(operations_item_id);
CREATE INDEX idx_pi_created_by ON public.plan_items(created_by);
CREATE INDEX idx_pi_status ON public.plan_items(status);

CREATE TRIGGER update_plan_items_updated_at
  BEFORE UPDATE ON public.plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_items_select"
  ON public.plan_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "plan_items_insert"
  ON public.plan_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'accountant')
    )
  );

CREATE POLICY "plan_items_update"
  ON public.plan_items
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'accountant')
    )
  );

CREATE POLICY "plan_items_delete"
  ON public.plan_items
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'accountant')
    )
  );

COMMIT;
