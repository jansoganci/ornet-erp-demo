BEGIN;

DELETE FROM public.tasks
WHERE id::text LIKE 'de000000-0000-0000-0005%';

INSERT INTO public.tasks (
  id,
  title,
  description,
  status,
  priority,
  work_order_id,
  due_date,
  due_time
)
VALUES
  ('de000000-0000-0000-0005-000000000001', '[DEMO] Verify camera blind spots', '[DEMO] Review blind spots and capture angles at Harbor Warehouse A.', 'pending', 'high', 'de000000-0000-0000-0004-000000000001', CURRENT_DATE + 1, TIME '09:30:00'),
  ('de000000-0000-0000-0005-000000000002', '[DEMO] Prepare cable route map', '[DEMO] Create final cable route map before installation at Harbor HQ Offices.', 'in_progress', 'normal', 'de000000-0000-0000-0004-000000000002', CURRENT_DATE, TIME '11:00:00'),
  ('de000000-0000-0000-0005-000000000003', '[DEMO] Confirm lobby camera labels', '[DEMO] Confirm NVR channel labels and camera naming for Northview Lobby.', 'completed', 'low', 'de000000-0000-0000-0004-000000000003', CURRENT_DATE - 14, TIME '10:15:00'),
  ('de000000-0000-0000-0005-000000000004', '[DEMO] Test siren trigger delay', '[DEMO] Measure alarm siren trigger delay and log values.', 'completed', 'normal', 'de000000-0000-0000-0004-000000000004', CURRENT_DATE - 10, TIME '13:20:00'),
  ('de000000-0000-0000-0005-000000000005', '[DEMO] Inspect loading dock sensor', '[DEMO] Inspect PIR sensor response near loading dock entrance.', 'pending', 'normal', 'de000000-0000-0000-0004-000000000005', CURRENT_DATE + 3, TIME '14:00:00'),
  ('de000000-0000-0000-0005-000000000006', '[DEMO] Align access control logs', '[DEMO] Align access logs with event timeline for BrightMart West Store.', 'in_progress', 'high', 'de000000-0000-0000-0004-000000000006', CURRENT_DATE + 2, TIME '15:30:00'),
  ('de000000-0000-0000-0005-000000000007', '[DEMO] Validate NVR backup retention', '[DEMO] Validate backup retention policy and sample playback at Keystone Data Center.', 'completed', 'high', 'de000000-0000-0000-0004-000000000007', CURRENT_DATE - 20, TIME '09:45:00'),
  ('de000000-0000-0000-0005-000000000008', '[DEMO] Recheck motion zones', '[DEMO] Recheck motion zones and false-positive sensitivity.', 'completed', 'low', 'de000000-0000-0000-0004-000000000008', CURRENT_DATE - 8, TIME '16:10:00'),
  ('de000000-0000-0000-0005-000000000009', '[DEMO] Finalize survey checklist', '[DEMO] Finalize security survey checklist for Avalon Main Campus.', 'in_progress', 'normal', 'de000000-0000-0000-0004-000000000009', CURRENT_DATE + 1, TIME '10:00:00'),
  ('de000000-0000-0000-0005-000000000010', '[DEMO] Verify door contact polarity', '[DEMO] Verify polarity and closure events for door contacts in Sports Hall.', 'completed', 'high', 'de000000-0000-0000-0004-000000000010', CURRENT_DATE - 18, TIME '12:30:00'),
  ('de000000-0000-0000-0005-000000000011', '[DEMO] Document maintenance output', '[DEMO] Document maintenance output and attach before/after notes.', 'completed', 'normal', 'de000000-0000-0000-0004-000000000011', CURRENT_DATE - 12, TIME '11:40:00'),
  ('de000000-0000-0000-0005-000000000012', '[DEMO] Plan plant floor walkthrough', '[DEMO] Plan walk route and checkpoints for Ridgeway plant floor audit.', 'pending', 'low', 'de000000-0000-0000-0004-000000000012', CURRENT_DATE + 5, TIME '09:10:00'),
  ('de000000-0000-0000-0005-000000000013', '[DEMO] Check sensor mounting height', '[DEMO] Check mounting height compliance for added motion sensors.', 'in_progress', 'high', 'de000000-0000-0000-0004-000000000013', CURRENT_DATE + 2, TIME '13:45:00'),
  ('de000000-0000-0000-0005-000000000014', '[DEMO] Share survey recommendation', '[DEMO] Share survey recommendation summary with operations board.', 'completed', 'normal', 'de000000-0000-0000-0004-000000000014', CURRENT_DATE - 25, TIME '17:00:00'),
  ('de000000-0000-0000-0005-000000000015', '[DEMO] Confirm spare part list', '[DEMO] Confirm spare parts list for next service cycle.', 'pending', 'normal', 'de000000-0000-0000-0004-000000000015', CURRENT_DATE + 4, TIME '10:20:00');

COMMIT;
