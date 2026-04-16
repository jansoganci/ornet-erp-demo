BEGIN;

DELETE FROM public.recurring_expense_templates
WHERE id::text LIKE 'de000000-0000-0000-0007%';

INSERT INTO public.recurring_expense_templates (
  id,
  name,
  expense_category_id,
  is_variable,
  amount,
  day_of_month,
  is_active,
  payment_method,
  has_invoice,
  vat_rate,
  description_template
)
VALUES
  (
    'de000000-0000-0000-0007-000000000001',
    '[DEMO] Office Rent - HQ',
    COALESCE((SELECT id FROM public.expense_categories WHERE code = 'rent' LIMIT 1), (SELECT id FROM public.expense_categories ORDER BY sort_order NULLS LAST, id LIMIT 1)),
    false,
    85000.00,
    1,
    true,
    'bank_transfer',
    true,
    20.00,
    '[DEMO] Monthly office rent payment for headquarters'
  ),
  (
    'de000000-0000-0000-0007-000000000002',
    '[DEMO] Vehicle Lease Fleet',
    COALESCE((SELECT id FROM public.expense_categories WHERE code = 'vehicle' LIMIT 1), (SELECT id FROM public.expense_categories ORDER BY sort_order NULLS LAST, id LIMIT 1)),
    false,
    26500.00,
    5,
    true,
    'bank_transfer',
    true,
    20.00,
    '[DEMO] Monthly lease payment for field service vehicles'
  ),
  (
    'de000000-0000-0000-0007-000000000003',
    '[DEMO] Software Subscriptions',
    COALESCE((SELECT id FROM public.expense_categories WHERE code = 'software' LIMIT 1), (SELECT id FROM public.expense_categories ORDER BY sort_order NULLS LAST, id LIMIT 1)),
    true,
    9400.00,
    7,
    true,
    'card',
    true,
    20.00,
    '[DEMO] Monthly software tools and cloud subscriptions'
  ),
  (
    'de000000-0000-0000-0007-000000000004',
    '[DEMO] Corporate Phone Bills',
    COALESCE((SELECT id FROM public.expense_categories WHERE code = 'communication' LIMIT 1), (SELECT id FROM public.expense_categories ORDER BY sort_order NULLS LAST, id LIMIT 1)),
    true,
    6200.00,
    12,
    true,
    'bank_transfer',
    true,
    20.00,
    '[DEMO] Monthly mobile and data plan invoices'
  ),
  (
    'de000000-0000-0000-0007-000000000005',
    '[DEMO] Business Insurance Premium',
    COALESCE((SELECT id FROM public.expense_categories WHERE code = 'insurance' LIMIT 1), (SELECT id FROM public.expense_categories ORDER BY sort_order NULLS LAST, id LIMIT 1)),
    false,
    14300.00,
    20,
    true,
    'bank_transfer',
    true,
    20.00,
    '[DEMO] Monthly business insurance premium for operations'
  );

COMMIT;
