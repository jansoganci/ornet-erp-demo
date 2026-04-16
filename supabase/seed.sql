/*
DEMO SEED DATA (safe to re-run)

What it does:
- Deletes ONLY rows that look like demo data (prefixed with "[DEMO]") in reverse FK order.
- Inserts realistic demo records with fixed UUIDs for: materials, customers, customer_sites,
  work_orders, work_order_materials, subscriptions, subscription_payments, sim_cards,
  proposals, proposal_items, financial_transactions, and site_assets.

How to run:
1) Supabase SQL Editor (recommended):
   - Open the SQL editor for your DEMO project
   - Paste the entire contents of this file and run

2) Supabase CLI (if you prefer):
   supabase db query --linked -f supabase/seed.sql

Reset:
- Re-run the file. The cleanup block at the top removes previous demo rows first.
*/

BEGIN;

-- ============================================================
-- Cleanup (reverse FK order)
-- ============================================================
DELETE FROM public.site_assets
WHERE equipment_name LIKE '[DEMO]%';

DELETE FROM public.financial_transactions
WHERE description LIKE '[DEMO]%';

DELETE FROM public.proposal_items
WHERE description LIKE '[DEMO]%';

DELETE FROM public.proposals
WHERE title LIKE '[DEMO]%';

DELETE FROM public.sim_cards
WHERE notes LIKE '[DEMO]%';

DELETE FROM public.subscription_payments
WHERE notes LIKE '[DEMO]%';

DELETE FROM public.subscriptions
WHERE notes LIKE '[DEMO]%';

DELETE FROM public.work_order_materials
WHERE description LIKE '[DEMO]%';

DELETE FROM public.work_orders
WHERE description LIKE '[DEMO]%';

DELETE FROM public.customer_sites
WHERE site_name LIKE '[DEMO]%';

DELETE FROM public.customers
WHERE company_name LIKE '[DEMO]%';

DELETE FROM public.materials
WHERE name LIKE '[DEMO]%';

-- ============================================================
-- 1) materials (8)
-- ============================================================
INSERT INTO public.materials (id, code, name, category, unit, is_active, description) VALUES
  ('de000000-0000-0000-0001-000000000001', 'DEMO-MAT-CAM-4MP', '[DEMO] 4MP IP Camera (Outdoor)', 'CCTV', 'adet', true, '[DEMO] Outdoor 4MP PoE IP camera, vandal-resistant housing.'),
  ('de000000-0000-0000-0001-000000000002', 'DEMO-MAT-MOT-SENSOR', '[DEMO] Motion Sensor PIR (Pet Immune)', 'Sensors', 'adet', true, '[DEMO] Dual-wall pet-immune PIR motion sensor for security monitoring.'),
  ('de000000-0000-0000-0001-000000000003', 'DEMO-MAT-DIN-PANEL', '[DEMO] DIN Rail Control Panel', 'Panels', 'adet', true, '[DEMO] Compact DIN rail enclosure for alarm/control wiring.'),
  ('de000000-0000-0000-0001-000000000004', 'DEMO-MAT-CCTV-CABLE', '[DEMO] CCTV Cable (Coax, RG59)', 'Cables', 'metre', true, '[DEMO] RG59 coaxial cable for CCTV runs (demo data).'),
  ('de000000-0000-0000-0001-000000000005', 'DEMO-MAT-ACCESS-KIT', '[DEMO] Access Control Starter Kit', 'Access Control', 'adet', true, '[DEMO] Starter kit for controlled access (demo).'),
  ('de000000-0000-0000-0001-000000000006', 'DEMO-MAT-DOOR-MAG', '[DEMO] Door Magnetic Contact', 'Door Contacts', 'adet', true, '[DEMO] Magnetic door contact for intrusion detection.'),
  ('de000000-0000-0000-0001-000000000007', 'DEMO-MAT-ALARM-SIREN', '[DEMO] External Alarm Siren', 'Siren', 'adet', true, '[DEMO] Weatherproof external alarm siren (demo).'),
  ('de000000-0000-0000-0001-000000000008', 'DEMO-MAT-NVR-8CH', '[DEMO] NVR 8-Channel Recorder', 'NVR', 'adet', true, '[DEMO] 8-channel NVR with H.265 support.');

-- ============================================================
-- 2) customers (6)
-- ============================================================
INSERT INTO public.customers (id, company_name, phone, phone_secondary, email, tax_number, notes) VALUES
  ('de000000-0000-0000-0002-000000000001', '[DEMO] Harbor Logistics Group', '+1-555-010001', '+1-555-010101', 'ops@harborlogistics.example', 'DEMO-TAX-010001', '[DEMO] Priority enterprise client for demo.'),
  ('de000000-0000-0000-0002-000000000002', '[DEMO] Northview Hotel Partners', '+1-555-010002', '+1-555-010102', 'security@northviewhotel.example', 'DEMO-TAX-010002', '[DEMO] Hospitality client; installs and periodic servicing.'),
  ('de000000-0000-0000-0002-000000000003', '[DEMO] BrightMart Retail Holdings', '+1-555-010003', '+1-555-010103', 'it@brightmart.example', 'DEMO-TAX-010003', '[DEMO] Retail chain with multiple sites.'),
  ('de000000-0000-0000-0002-000000000004', '[DEMO] Keystone FinTech Services', '+1-555-010004', '+1-555-010104', 'compliance@keystonefintech.example', 'DEMO-TAX-010004', '[DEMO] Finance client; strict access controls.'),
  ('de000000-0000-0000-0002-000000000005', '[DEMO] Avalon Education Academy', '+1-555-010005', '+1-555-010105', 'safety@avalonacademy.example', 'DEMO-TAX-010005', '[DEMO] Education client; student safety monitoring.'),
  ('de000000-0000-0000-0002-000000000006', '[DEMO] Ridgeway Manufacturing', '+1-555-010006', '+1-555-010106', 'maintenance@ridgewaymfg.example', 'DEMO-TAX-010006', '[DEMO] Manufacturing client; on-site maintenance schedules.');

-- ============================================================
-- 3) customer_sites (12) - 2 per customer
-- ============================================================
INSERT INTO public.customer_sites
  (id, customer_id, account_no, site_name, address, city, district, contact_name, contact_phone, panel_info, notes, is_active)
VALUES
  ('de000000-0000-0000-0003-000000000001', 'de000000-0000-0000-0002-000000000001', 'DEMO-ACC-1001', '[DEMO] Harbor - Warehouse A', '1100 Dockside Ave, Building 3', 'New York', 'Brooklyn', 'Daniel Reyes', '+1-555-020001', 'NX-Panel v2', '[DEMO] Main receiving warehouse site.', true),
  ('de000000-0000-0000-0003-000000000002', 'de000000-0000-0000-0002-000000000001', 'DEMO-ACC-1002', '[DEMO] Harbor - HQ Offices', '220 Harbor Blvd', 'New York', 'Queens', 'Maya Thompson', '+1-555-020002', 'NX-Panel v2', '[DEMO] HQ perimeter and office cameras.', true),

  ('de000000-0000-0000-0003-000000000003', 'de000000-0000-0000-0002-000000000002', 'DEMO-ACC-2001', '[DEMO] Northview - Downtown Lobby', '55 Market Street', 'Chicago', 'Loop', 'Kevin Parker', '+1-555-020003', 'C2-Control', '[DEMO] Guest entrance camera coverage.', true),
  ('de000000-0000-0000-0003-000000000004', 'de000000-0000-0000-0002-000000000002', 'DEMO-ACC-2002', '[DEMO] Northview - Conference Wing', '700 Lakeview Dr', 'Chicago', 'Evanston', 'Sofia Martin', '+1-555-020004', 'C2-Control', '[DEMO] Conference wing access and alarm panel.', true),

  ('de000000-0000-0000-0003-000000000005', 'de000000-0000-0000-0002-000000000003', 'DEMO-ACC-3001', '[DEMO] BrightMart - East Store', '15 Aurora Road', 'Austin', 'East Austin', 'Emily Carter', '+1-555-020005', 'BM-Alarm Pro', '[DEMO] Retail camera and sensor servicing.', true),
  ('de000000-0000-0000-0003-000000000006', 'de000000-0000-0000-0002-000000000003', 'DEMO-ACC-3002', '[DEMO] BrightMart - West Store', '880 Westgate Blvd', 'Austin', 'South Lamar', 'George Lee', '+1-555-020006', 'BM-Alarm Pro', '[DEMO] Backroom access controls.', true),

  ('de000000-0000-0000-0003-000000000007', 'de000000-0000-0000-0002-000000000004', 'DEMO-ACC-4001', '[DEMO] Keystone - Data Center', '10 Compliance Way', 'San Francisco', 'SoMa', 'Olivia Brown', '+1-555-020007', 'KS-Control', '[DEMO] Data center monitoring and alarms.', true),
  ('de000000-0000-0000-0003-000000000008', 'de000000-0000-0000-0002-000000000004', 'DEMO-ACC-4002', '[DEMO] Keystone - Branch Office', '420 Mission Street', 'San Francisco', 'Mission', 'Noah Davis', '+1-555-020008', 'KS-Control', '[DEMO] Branch perimeter and access kit.', true),

  ('de000000-0000-0000-0003-000000000009', 'de000000-0000-0000-0002-000000000005', 'DEMO-ACC-5001', '[DEMO] Avalon - Main Campus', '200 Learning Ln', 'Boston', 'Cambridge', 'Amelia Wilson', '+1-555-020009', 'AV-Panel', '[DEMO] Campus camera review schedule.', true),
  ('de000000-0000-0000-0003-000000000010', 'de000000-0000-0000-0002-000000000005', 'DEMO-ACC-5002', '[DEMO] Avalon - Sports Hall', '77 Training Blvd', 'Boston', 'Somerville', 'Liam Anderson', '+1-555-020010', 'AV-Panel', '[DEMO] Entrance sensors and siren coverage.', true),

  ('de000000-0000-0000-0003-000000000011', 'de000000-0000-0000-0002-000000000006', 'DEMO-ACC-6001', '[DEMO] Ridgeway - Campus Offices', '505 Industrial Rd', 'Los Angeles', 'Glendale', 'Charlotte King', '+1-555-020011', 'RG-Control', '[DEMO] Office access control and NVR setup.', true),
  ('de000000-0000-0000-0003-000000000012', 'de000000-0000-0000-0002-000000000006', 'DEMO-ACC-6002', '[DEMO] Ridgeway - Plant Floor', '900 Foundry St', 'Los Angeles', 'Burbank', 'Henry Martinez', '+1-555-020012', 'RG-Control', '[DEMO] Plant alarms and motion sensors.', true);

-- ============================================================
-- 4) work_orders (20)
-- ============================================================
INSERT INTO public.work_orders
  (id, status, priority, scheduled_date, scheduled_time, description, notes, site_id, amount, currency, work_type, materials_discount_percent, vat_rate, has_tevkifat, completed_at)
VALUES
  ('de000000-0000-0000-0004-000000000001', 'pending', 'normal', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), TIME '09:00:00', '[DEMO] Security survey at Harbor Warehouse A', '[DEMO] Initial camera coverage verification and checklist.', 'de000000-0000-0000-0003-000000000001', 24000.00, 'TRY', 'survey', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000002', 'in_progress', 'high',  (date_trunc('month', CURRENT_DATE - interval '4 months')::date), TIME '10:30:00', '[DEMO] Installation in progress at Harbor HQ Offices', '[DEMO] PoE camera mounting and cable routing.', 'de000000-0000-0000-0003-000000000002', 31000.00, 'TRY', 'installation', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000003', 'completed', 'urgent', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), TIME '11:00:00', '[DEMO] On-site service: Northview Lobby camera refresh', '[DEMO] Replaced channels and ran diagnostics.', 'de000000-0000-0000-0003-000000000003', 48000.00, 'TRY', 'service', 0, 20, false, (NOW() - interval '75 days')),
  ('de000000-0000-0000-0004-000000000004', 'completed', 'normal', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), TIME '09:30:00', '[DEMO] Installation completed: Northview Conference Wing alarm siren', '[DEMO] Panel integration and siren testing.', 'de000000-0000-0000-0003-000000000004', 32000.00, 'TRY', 'installation', 0, 20, false, (NOW() - interval '45 days')),
  ('de000000-0000-0000-0004-000000000005', 'pending', 'low',    (date_trunc('month', CURRENT_DATE - interval '4 months')::date), TIME '13:00:00', '[DEMO] Maintenance request at BrightMart East Store', '[DEMO] Routine check and minor adjustment.', 'de000000-0000-0000-0003-000000000005', 19000.00, 'TRY', 'maintenance', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000006', 'in_progress', 'normal', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), TIME '10:00:00', '[DEMO] Service in progress at BrightMart West Store', '[DEMO] Access kit alignment and sensor tuning.', 'de000000-0000-0000-0003-000000000006', 26000.00, 'TRY', 'service', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000007', 'completed', 'high',   (date_trunc('month', CURRENT_DATE - interval '5 months')::date), TIME '09:15:00', '[DEMO] Installation completed: Keystone Data Center NVR upgrade', '[DEMO] NVR install and camera sync test.', 'de000000-0000-0000-0003-000000000007', 56000.00, 'TRY', 'installation', 0, 20, false, (NOW() - interval '120 days')),
  ('de000000-0000-0000-0004-000000000008', 'completed', 'normal', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), TIME '14:00:00', '[DEMO] Maintenance completed: Keystone Branch Office monitoring tune-up', '[DEMO] Updated motion sensitivity and verified alerts.', 'de000000-0000-0000-0003-000000000008', 27000.00, 'TRY', 'maintenance', 0, 20, false, (NOW() - interval '55 days')),
  ('de000000-0000-0000-0004-000000000009', 'in_progress', 'normal', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), TIME '09:45:00', '[DEMO] Survey underway at Avalon Main Campus', '[DEMO] Mapping entrance sensors and siren placement.', 'de000000-0000-0000-0003-000000000009', 15000.00, 'TRY', 'survey', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000010', 'completed', 'urgent', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), TIME '10:45:00', '[DEMO] Installation completed: Avalon Sports Hall access contacts', '[DEMO] Door magnet placement and cabling review.', 'de000000-0000-0000-0003-000000000010', 61000.00, 'TRY', 'installation', 0, 20, false, (NOW() - interval '88 days')),
  ('de000000-0000-0000-0004-000000000011', 'completed', 'normal', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), TIME '11:30:00', '[DEMO] Service completed: Ridgeway Office alarm maintenance', '[DEMO] Rebalanced wiring and ran failover test.', 'de000000-0000-0000-0003-000000000011', 39000.00, 'TRY', 'service', 0, 20, false, (NOW() - interval '105 days')),
  ('de000000-0000-0000-0004-000000000012', 'pending', 'normal', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), TIME '15:00:00', '[DEMO] Maintenance scheduled: Ridgeway Plant Floor', '[DEMO] Planned siren and motion sensor check.', 'de000000-0000-0000-0003-000000000012', 22000.00, 'TRY', 'maintenance', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000013', 'in_progress', 'high', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), TIME '09:10:00', '[DEMO] Installation in progress: Harbor HQ expansion sensors', '[DEMO] Adding motion sensors and testing alerts.', 'de000000-0000-0000-0003-000000000002', 28000.00, 'TRY', 'installation', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000014', 'completed', 'normal', (date_trunc('month', CURRENT_DATE - interval '6 months')::date), TIME '10:20:00', '[DEMO] Survey completed: Northview Lobby camera coverage assessment', '[DEMO] Delivered report and recommended upgrades.', 'de000000-0000-0000-0003-000000000003', 72000.00, 'TRY', 'survey', 0, 20, false, (NOW() - interval '155 days')),
  ('de000000-0000-0000-0004-000000000015', 'completed', 'high',   (date_trunc('month', CURRENT_DATE - interval '2 months')::date), TIME '12:10:00', '[DEMO] Service completed: BrightMart East Store access control tune-up', '[DEMO] Access kit calibration and door contact testing.', 'de000000-0000-0000-0003-000000000005', 45000.00, 'TRY', 'service', 0, 20, false, (NOW() - interval '60 days')),
  ('de000000-0000-0000-0004-000000000016', 'in_progress', 'low',  (date_trunc('month', CURRENT_DATE - interval '3 months')::date), TIME '09:20:00', '[DEMO] Installation in progress: Keystone branch office siren run', '[DEMO] Running cabling and testing siren trigger.', 'de000000-0000-0000-0003-000000000008', 17000.00, 'TRY', 'installation', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000017', 'pending', 'normal', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), TIME '13:10:00', '[DEMO] Maintenance planned: BrightMart West Store sensor check', '[DEMO] Scheduled routine inspections.', 'de000000-0000-0000-0003-000000000006', 20000.00, 'TRY', 'maintenance', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000018', 'completed', 'urgent', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), TIME '10:40:00', '[DEMO] Installation completed: Northview Downtown Lobby NVR sync', '[DEMO] NVR sync and alert verification.', 'de000000-0000-0000-0003-000000000004', 33000.00, 'TRY', 'installation', 0, 20, false, (NOW() - interval '35 days')),
  ('de000000-0000-0000-0004-000000000019', 'in_progress', 'normal', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), TIME '09:55:00', '[DEMO] Survey in progress: BrightMart distribution site', '[DEMO] Final mapping before installation window.', 'de000000-0000-0000-0003-000000000006', 12000.00, 'TRY', 'survey', 0, 20, false, NULL),
  ('de000000-0000-0000-0004-000000000020', 'completed', 'high',   (date_trunc('month', CURRENT_DATE - interval '3 months')::date), TIME '11:20:00', '[DEMO] Service completed: Ridgeway Plant Floor alarm monitoring', '[DEMO] Updated monitoring and verified all triggers.', 'de000000-0000-0000-0003-000000000011', 66000.00, 'TRY', 'service', 0, 20, false, (NOW() - interval '80 days'));

-- ============================================================
-- 5) work_order_materials (completed WOs only) - 24 links
-- ============================================================
INSERT INTO public.work_order_materials
  (id, work_order_id, material_id, quantity, description, unit, unit_price_usd, unit_price, sort_order)
VALUES
  ('de000000-0000-0000-0005-000000000001', 'de000000-0000-0000-0004-000000000003', 'de000000-0000-0000-0001-000000000001', 2, '[DEMO] Outdoor camera units for WO3', 'adet', 120.00, 3600.00, 1),
  ('de000000-0000-0000-0005-000000000002', 'de000000-0000-0000-0004-000000000003', 'de000000-0000-0000-0001-000000000002', 1, '[DEMO] Motion sensor for WO3', 'adet', 45.00, 1350.00, 2),

  ('de000000-0000-0000-0005-000000000003', 'de000000-0000-0000-0004-000000000004', 'de000000-0000-0000-0001-000000000003', 1, '[DEMO] DIN panel for WO4', 'adet', 25.00, 750.00, 1),
  ('de000000-0000-0000-0005-000000000004', 'de000000-0000-0000-0004-000000000004', 'de000000-0000-0000-0001-000000000007', 2, '[DEMO] External sirens for WO4', 'adet', 60.00, 1800.00, 2),

  ('de000000-0000-0000-0005-000000000005', 'de000000-0000-0000-0004-000000000007', 'de000000-0000-0000-0001-000000000008', 1, '[DEMO] NVR recorder for WO7', 'adet', 450.00, 13500.00, 1),
  ('de000000-0000-0000-0005-000000000006', 'de000000-0000-0000-0004-000000000007', 'de000000-0000-0000-0001-000000000001', 1, '[DEMO] Camera for WO7', 'adet', 120.00, 3600.00, 2),
  ('de000000-0000-0000-0005-000000000007', 'de000000-0000-0000-0004-000000000007', 'de000000-0000-0000-0001-000000000004', 50, '[DEMO] Coax cable (metre) for WO7', 'metre', 0.90, 27.00, 3),

  ('de000000-0000-0000-0005-000000000008', 'de000000-0000-0000-0004-000000000008', 'de000000-0000-0000-0001-000000000005', 1, '[DEMO] Access control kit for WO8', 'adet', 250.00, 7500.00, 1),
  ('de000000-0000-0000-0005-000000000009', 'de000000-0000-0000-0004-000000000008', 'de000000-0000-0000-0001-000000000002', 2, '[DEMO] Motion sensors for WO8', 'adet', 45.00, 1350.00, 2),

  ('de000000-0000-0000-0005-000000000010', 'de000000-0000-0000-0004-000000000010', 'de000000-0000-0000-0001-000000000008', 1, '[DEMO] NVR for WO10', 'adet', 450.00, 13500.00, 1),
  ('de000000-0000-0000-0005-000000000011', 'de000000-0000-0000-0004-000000000010', 'de000000-0000-0000-0001-000000000006', 20, '[DEMO] Door magnets for WO10', 'adet', 8.00, 240.00, 2),
  ('de000000-0000-0000-0005-000000000012', 'de000000-0000-0000-0004-000000000010', 'de000000-0000-0000-0001-000000000004', 80, '[DEMO] Coax cable for WO10', 'metre', 0.90, 27.00, 3),

  ('de000000-0000-0000-0005-000000000013', 'de000000-0000-0000-0004-000000000011', 'de000000-0000-0000-0001-000000000003', 2, '[DEMO] DIN panels for WO11', 'adet', 25.00, 750.00, 1),
  ('de000000-0000-0000-0005-000000000014', 'de000000-0000-0000-0004-000000000011', 'de000000-0000-0000-0001-000000000007', 1, '[DEMO] Siren for WO11', 'adet', 60.00, 1800.00, 2),

  ('de000000-0000-0000-0005-000000000015', 'de000000-0000-0000-0004-000000000014', 'de000000-0000-0000-0001-000000000001', 3, '[DEMO] Camera units for WO14', 'adet', 120.00, 3600.00, 1),
  ('de000000-0000-0000-0005-000000000016', 'de000000-0000-0000-0004-000000000014', 'de000000-0000-0000-0001-000000000005', 1, '[DEMO] Access kit for WO14', 'adet', 250.00, 7500.00, 2),
  ('de000000-0000-0000-0005-000000000017', 'de000000-0000-0000-0004-000000000014', 'de000000-0000-0000-0001-000000000004', 120, '[DEMO] Coax cable for WO14', 'metre', 0.90, 27.00, 3),

  ('de000000-0000-0000-0005-000000000018', 'de000000-0000-0000-0004-000000000015', 'de000000-0000-0000-0001-000000000002', 5, '[DEMO] Motion sensors for WO15', 'adet', 45.00, 1350.00, 1),
  ('de000000-0000-0000-0005-000000000019', 'de000000-0000-0000-0004-000000000015', 'de000000-0000-0000-0001-000000000006', 10, '[DEMO] Door magnets for WO15', 'adet', 8.00, 240.00, 2),

  ('de000000-0000-0000-0005-000000000020', 'de000000-0000-0000-0004-000000000018', 'de000000-0000-0000-0001-000000000008', 2, '[DEMO] NVR recorders for WO18', 'adet', 450.00, 13500.00, 1),
  ('de000000-0000-0000-0005-000000000021', 'de000000-0000-0000-0004-000000000018', 'de000000-0000-0000-0001-000000000007', 1, '[DEMO] Alarm siren for WO18', 'adet', 60.00, 1800.00, 2),

  ('de000000-0000-0000-0005-000000000022', 'de000000-0000-0000-0004-000000000020', 'de000000-0000-0000-0001-000000000001', 2, '[DEMO] Camera units for WO20', 'adet', 120.00, 3600.00, 1),
  ('de000000-0000-0000-0005-000000000023', 'de000000-0000-0000-0004-000000000020', 'de000000-0000-0000-0001-000000000002', 2, '[DEMO] Motion sensors for WO20', 'adet', 45.00, 1350.00, 2),
  ('de000000-0000-0000-0005-000000000024', 'de000000-0000-0000-0004-000000000020', 'de000000-0000-0000-0001-000000000005', 1, '[DEMO] Access kit for WO20', 'adet', 250.00, 7500.00, 3);

-- ============================================================
-- 6) subscriptions (8)
-- ============================================================
INSERT INTO public.subscriptions
  (id, site_id, status, start_date, billing_day, base_price, sms_fee, line_fee, vat_rate, cost, currency, billing_frequency, official_invoice, notes, setup_notes)
VALUES
  ('de000000-0000-0000-0006-000000000001', 'de000000-0000-0000-0003-000000000001', 'active', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 1, 2500.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'monthly', true,  '[DEMO] Demo subscription for Harbor - Warehouse A', '[DEMO] Monitoring setup notes for demo.'),
  ('de000000-0000-0000-0006-000000000002', 'de000000-0000-0000-0003-000000000003', 'active', (date_trunc('month', CURRENT_DATE - interval '6 months')::date), 1, 1800.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'yearly',   false, '[DEMO] Demo subscription for Northview - Downtown Lobby', '[DEMO] Official invoice disabled in demo.'),
  ('de000000-0000-0000-0006-000000000003', 'de000000-0000-0000-0003-000000000005', 'active', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 1, 4200.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'monthly',  true,  '[DEMO] Demo subscription for BrightMart - East Store', '[DEMO] Active monitoring subscription.'),
  ('de000000-0000-0000-0006-000000000004', 'de000000-0000-0000-0003-000000000006', 'paused', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 1, 3100.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'monthly',  true,  '[DEMO] Paused demo subscription for BrightMart - West Store', '[DEMO] Shows paused state in UI.'),
  ('de000000-0000-0000-0006-000000000005', 'de000000-0000-0000-0003-000000000007', 'active', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 1, 1500.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'monthly',  true,  '[DEMO] Demo subscription for Keystone - Data Center', '[DEMO] Active monitoring with access controls.'),
  ('de000000-0000-0000-0006-000000000006', 'de000000-0000-0000-0003-000000000009', 'active', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 1, 5200.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'monthly',  false, '[DEMO] Demo subscription for Avalon - Main Campus', '[DEMO] Official invoice disabled in demo.'),
  ('de000000-0000-0000-0006-000000000007', 'de000000-0000-0000-0003-000000000010', 'active', (date_trunc('month', CURRENT_DATE - interval '6 months')::date), 1, 2600.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'yearly',   true,  '[DEMO] Demo subscription for Avalon - Sports Hall', '[DEMO] Yearly billing frequency in demo.'),
  ('de000000-0000-0000-0006-000000000008', 'de000000-0000-0000-0003-000000000011', 'active', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 1, 3900.00, 0.00, 0.00, 20.00, 0.00, 'TRY', 'monthly',  true,  '[DEMO] Demo subscription for Ridgeway - Campus Offices', '[DEMO] Active subscription for demo finance entries.');

-- ============================================================
-- 7) subscription_payments (6 months per subscription = 48 rows)
-- ============================================================
-- Month offsets: 5,4,3,2,1,0 months ago (relative to CURRENT_DATE).
INSERT INTO public.subscription_payments
  (id, subscription_id, payment_month, amount, vat_amount, total_amount, status, payment_date, payment_method, invoice_no, notes)
VALUES
  -- Sub1 (Pay1..Pay6) base_price=2500, vat=500, total=3000
  ('de000000-0000-0000-0010-000000000001', 'de000000-0000-0000-0006-000000000001', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 2500.00, 500.00, 3000.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000002', 'de000000-0000-0000-0006-000000000001', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 2500.00, 500.00, 3000.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000003', 'de000000-0000-0000-0006-000000000001', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 2500.00, 500.00, 3000.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-2500-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000004', 'de000000-0000-0000-0006-000000000001', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 2500.00, 500.00, 3000.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000005', 'de000000-0000-0000-0006-000000000001', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 2500.00, 500.00, 3000.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-2500-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000006', 'de000000-0000-0000-0006-000000000001', (date_trunc('month', CURRENT_DATE)::date), 2500.00, 500.00, 3000.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub2 (Pay7..Pay12) base_price=1800, vat=360, total=2160
  ('de000000-0000-0000-0010-000000000007', 'de000000-0000-0000-0006-000000000002', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 1800.00, 360.00, 2160.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000008', 'de000000-0000-0000-0006-000000000002', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 1800.00, 360.00, 2160.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000009', 'de000000-0000-0000-0006-000000000002', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 1800.00, 360.00, 2160.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-1800-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000010', 'de000000-0000-0000-0006-000000000002', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 1800.00, 360.00, 2160.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000011', 'de000000-0000-0000-0006-000000000002', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 1800.00, 360.00, 2160.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-1800-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000012', 'de000000-0000-0000-0006-000000000002', (date_trunc('month', CURRENT_DATE)::date), 1800.00, 360.00, 2160.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub3 (Pay13..Pay18) base_price=4200, vat=840, total=5040
  ('de000000-0000-0000-0010-000000000013', 'de000000-0000-0000-0006-000000000003', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 4200.00, 840.00, 5040.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000014', 'de000000-0000-0000-0006-000000000003', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 4200.00, 840.00, 5040.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000015', 'de000000-0000-0000-0006-000000000003', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 4200.00, 840.00, 5040.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-4200-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000016', 'de000000-0000-0000-0006-000000000003', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 4200.00, 840.00, 5040.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000017', 'de000000-0000-0000-0006-000000000003', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 4200.00, 840.00, 5040.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-4200-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000018', 'de000000-0000-0000-0006-000000000003', (date_trunc('month', CURRENT_DATE)::date), 4200.00, 840.00, 5040.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub4 (Pay19..Pay24) base_price=3100, vat=620, total=3720
  ('de000000-0000-0000-0010-000000000019', 'de000000-0000-0000-0006-000000000004', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 3100.00, 620.00, 3720.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000020', 'de000000-0000-0000-0006-000000000004', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 3100.00, 620.00, 3720.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000021', 'de000000-0000-0000-0006-000000000004', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 3100.00, 620.00, 3720.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-3100-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000022', 'de000000-0000-0000-0006-000000000004', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 3100.00, 620.00, 3720.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000023', 'de000000-0000-0000-0006-000000000004', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 3100.00, 620.00, 3720.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-3100-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000024', 'de000000-0000-0000-0006-000000000004', (date_trunc('month', CURRENT_DATE)::date), 3100.00, 620.00, 3720.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub5 (Pay25..Pay30) base_price=1500, vat=300, total=1800
  ('de000000-0000-0000-0010-000000000025', 'de000000-0000-0000-0006-000000000005', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 1500.00, 300.00, 1800.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000026', 'de000000-0000-0000-0006-000000000005', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 1500.00, 300.00, 1800.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000027', 'de000000-0000-0000-0006-000000000005', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 1500.00, 300.00, 1800.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-1500-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000028', 'de000000-0000-0000-0006-000000000005', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 1500.00, 300.00, 1800.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000029', 'de000000-0000-0000-0006-000000000005', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 1500.00, 300.00, 1800.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-1500-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000030', 'de000000-0000-0000-0006-000000000005', (date_trunc('month', CURRENT_DATE)::date), 1500.00, 300.00, 1800.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub6 (Pay31..Pay36) base_price=5200, vat=1040, total=6240
  ('de000000-0000-0000-0010-000000000031', 'de000000-0000-0000-0006-000000000006', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 5200.00, 1040.00, 6240.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000032', 'de000000-0000-0000-0006-000000000006', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 5200.00, 1040.00, 6240.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000033', 'de000000-0000-0000-0006-000000000006', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 5200.00, 1040.00, 6240.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-5200-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000034', 'de000000-0000-0000-0006-000000000006', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 5200.00, 1040.00, 6240.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000035', 'de000000-0000-0000-0006-000000000006', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 5200.00, 1040.00, 6240.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-5200-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000036', 'de000000-0000-0000-0006-000000000006', (date_trunc('month', CURRENT_DATE)::date), 5200.00, 1040.00, 6240.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub7 (Pay37..Pay42) base_price=2600, vat=520, total=3120
  ('de000000-0000-0000-0010-000000000037', 'de000000-0000-0000-0006-000000000007', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 2600.00, 520.00, 3120.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000038', 'de000000-0000-0000-0006-000000000007', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 2600.00, 520.00, 3120.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000039', 'de000000-0000-0000-0006-000000000007', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 2600.00, 520.00, 3120.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-2600-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000040', 'de000000-0000-0000-0006-000000000007', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 2600.00, 520.00, 3120.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000041', 'de000000-0000-0000-0006-000000000007', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 2600.00, 520.00, 3120.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-2600-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000042', 'de000000-0000-0000-0006-000000000007', (date_trunc('month', CURRENT_DATE)::date), 2600.00, 520.00, 3120.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),

  -- Sub8 (Pay43..Pay48) base_price=3900, vat=780, total=4680
  ('de000000-0000-0000-0010-000000000043', 'de000000-0000-0000-0006-000000000008', (date_trunc('month', CURRENT_DATE - interval '5 months')::date), 3900.00, 780.00, 4680.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '5 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000044', 'de000000-0000-0000-0006-000000000008', (date_trunc('month', CURRENT_DATE - interval '4 months')::date), 3900.00, 780.00, 4680.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '4 months')::date) + interval '15 days')::date, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000045', 'de000000-0000-0000-0006-000000000008', (date_trunc('month', CURRENT_DATE - interval '3 months')::date), 3900.00, 780.00, 4680.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '3 months')::date) + interval '12 days')::date, 'bank_transfer', 'DEMO-INV-3900-03', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000046', 'de000000-0000-0000-0006-000000000008', (date_trunc('month', CURRENT_DATE - interval '2 months')::date), 3900.00, 780.00, 4680.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000047', 'de000000-0000-0000-0006-000000000008', (date_trunc('month', CURRENT_DATE - interval '1 months')::date), 3900.00, 780.00, 4680.00, 'paid',   ((date_trunc('month', CURRENT_DATE - interval '1 months')::date) + interval '10 days')::date, 'bank_transfer', 'DEMO-INV-3900-01', '[DEMO] Subscription payment record'),
  ('de000000-0000-0000-0010-000000000048', 'de000000-0000-0000-0006-000000000008', (date_trunc('month', CURRENT_DATE)::date), 3900.00, 780.00, 4680.00, 'pending', NULL, 'bank_transfer', NULL, '[DEMO] Subscription payment record');

-- ============================================================
-- 8) sim_cards (15)
-- ============================================================
INSERT INTO public.sim_cards
  (id, phone_number, operator, status, customer_id, site_id, cost_price, sale_price, currency, notes)
VALUES
  ('de000000-0000-0000-0007-000000000001', '+1-555-030001', 'TURKCELL', 'active',  'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000001', 20.00, 35.00, 'TRY', '[DEMO] Monitoring SIM assigned to Harbor Warehouse A'),
  ('de000000-0000-0000-0007-000000000002', '+1-555-030002', 'VODAFONE', 'active', 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000001', 18.00, 32.00, 'TRY', '[DEMO] Monitoring SIM assigned to Harbor Warehouse A'),
  ('de000000-0000-0000-0007-000000000003', '+1-555-030003', 'TURK_TELEKOM', 'available', 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000002', 18.00, 30.00, 'TRY', '[DEMO] Spare SIM for Harbor HQ Offices'),

  ('de000000-0000-0000-0007-000000000004', '+1-555-030004', 'TURKCELL', 'active', 'de000000-0000-0000-0002-000000000002', 'de000000-0000-0000-0003-000000000003', 20.00, 35.00, 'TRY', '[DEMO] Monitoring SIM assigned to Northview Downtown Lobby'),
  ('de000000-0000-0000-0007-000000000005', '+1-555-030005', 'VODAFONE', 'inactive', 'de000000-0000-0000-0002-000000000002', 'de000000-0000-0000-0003-000000000004', 19.00, 33.00, 'TRY', '[DEMO] Inactive SIM for Northview Conference Wing'),

  ('de000000-0000-0000-0007-000000000006', '+1-555-030006', 'TURKCELL', 'active', 'de000000-0000-0000-0002-000000000003', 'de000000-0000-0000-0003-000000000005', 21.00, 36.00, 'TRY', '[DEMO] Monitoring SIM assigned to BrightMart East Store'),
  ('de000000-0000-0000-0007-000000000007', '+1-555-030007', 'VODAFONE', 'available', 'de000000-0000-0000-0002-000000000003', 'de000000-0000-0000-0003-000000000006', 21.00, 34.00, 'TRY', '[DEMO] Spare SIM for BrightMart West Store'),

  ('de000000-0000-0000-0007-000000000008', '+1-555-030008', 'TURK_TELEKOM', 'active', 'de000000-0000-0000-0002-000000000004', 'de000000-0000-0000-0003-000000000007', 22.00, 37.00, 'TRY', '[DEMO] Monitoring SIM assigned to Keystone Data Center'),
  ('de000000-0000-0000-0007-000000000009', '+1-555-030009', 'TURKCELL', 'available', 'de000000-0000-0000-0002-000000000004', 'de000000-0000-0000-0003-000000000008', 18.00, 30.00, 'TRY', '[DEMO] Spare SIM for Keystone Branch Office'),

  ('de000000-0000-0000-0007-000000000010', '+1-555-030010', 'TURKCELL', 'active', 'de000000-0000-0000-0002-000000000005', 'de000000-0000-0000-0003-000000000009', 21.00, 36.00, 'TRY', '[DEMO] Monitoring SIM assigned to Avalon Main Campus'),
  ('de000000-0000-0000-0007-000000000011', '+1-555-030011', 'VODAFONE', 'available', 'de000000-0000-0000-0002-000000000005', 'de000000-0000-0000-0003-000000000010', 19.00, 33.00, 'TRY', '[DEMO] Spare SIM for Avalon Sports Hall'),

  ('de000000-0000-0000-0007-000000000012', '+1-555-030012', 'TURK_TELEKOM', 'active', 'de000000-0000-0000-0002-000000000006', 'de000000-0000-0000-0003-000000000011', 20.00, 35.00, 'TRY', '[DEMO] Monitoring SIM assigned to Ridgeway Campus Offices'),
  ('de000000-0000-0000-0007-000000000013', '+1-555-030013', 'VODAFONE', 'available', 'de000000-0000-0000-0002-000000000006', 'de000000-0000-0000-0003-000000000012', 20.00, 32.00, 'TRY', '[DEMO] Spare SIM for Ridgeway Plant Floor'),

  ('de000000-0000-0000-0007-000000000014', '+1-555-030014', 'TURKCELL', 'active', 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000002', 18.00, 34.00, 'TRY', '[DEMO] Monitoring SIM assigned to Harbor HQ Offices'),
  ('de000000-0000-0000-0007-000000000015', '+1-555-030015', 'VODAFONE', 'sold', 'de000000-0000-0000-0002-000000000003', 'de000000-0000-0000-0003-000000000006', 0.00, 0.00, 'TRY', '[DEMO] Sold SIM record for demo history');

-- ============================================================
-- 9) proposals (2)
-- ============================================================
INSERT INTO public.proposals
  (id, proposal_no, site_id, title, notes, scope_of_work, currency, total_amount_usd, total_amount, status, has_tevkifat, contract_type, proposal_date, vat_rate)
VALUES
  ('de000000-0000-0000-0008-000000000001', 'DEMO-PR-0001', 'de000000-0000-0000-0003-000000000002', '[DEMO] Accepted Proposal: CCTV upgrade for Harbor HQ Offices', '[DEMO] Signed and accepted by client (demo).', 'Upgrade CCTV system with new cameras, NVR, and access contacts.', 'USD', 1390.00, 41700.00, 'accepted', false, 'sale', (CURRENT_DATE - interval '20 days')::date, 20.00),
  ('de000000-0000-0000-0008-000000000002', 'DEMO-PR-0002', 'de000000-0000-0000-0003-000000000004', '[DEMO] Pending Proposal: Alarm maintenance & sensor plan', '[DEMO] Awaiting approval and scheduling (demo).', 'Perform preventive maintenance and install additional motion sensors and sirens.', 'USD', 940.00, 28200.00, 'sent', false, 'sale', (CURRENT_DATE - interval '12 days')::date, 20.00);

-- ============================================================
-- 10) proposal_items (7)
-- ============================================================
INSERT INTO public.proposal_items
  (id, proposal_id, sort_order, description, quantity, unit, unit_price_usd, unit_price, material_id)
VALUES
  ('de000000-0000-0000-0009-000000000001', 'de000000-0000-0000-0008-000000000001', 1, '[DEMO] 4MP IP Camera - outdoor', 5, 'adet', 120.00, 3600.00, 'de000000-0000-0000-0001-000000000001'),
  ('de000000-0000-0000-0009-000000000002', 'de000000-0000-0000-0008-000000000001', 2, '[DEMO] NVR 8-channel recorder', 1, 'adet', 450.00, 13500.00, 'de000000-0000-0000-0001-000000000008'),
  ('de000000-0000-0000-0009-000000000003', 'de000000-0000-0000-0008-000000000001', 3, '[DEMO] Door magnetic contact', 20, 'adet', 8.00, 240.00, 'de000000-0000-0000-0001-000000000006'),
  ('de000000-0000-0000-0009-000000000004', 'de000000-0000-0000-0008-000000000001', 4, '[DEMO] Coax cable (RG59) - metre', 200, 'metre', 0.90, 27.00, 'de000000-0000-0000-0001-000000000004'),

  ('de000000-0000-0000-0009-000000000005', 'de000000-0000-0000-0008-000000000002', 1, '[DEMO] Motion sensor PIR - pet immune', 10, 'adet', 45.00, 1350.00, 'de000000-0000-0000-0001-000000000002'),
  ('de000000-0000-0000-0009-000000000006', 'de000000-0000-0000-0008-000000000002', 2, '[DEMO] Access control starter kit', 1, 'adet', 250.00, 7500.00, 'de000000-0000-0000-0001-000000000005'),
  ('de000000-0000-0000-0009-000000000007', 'de000000-0000-0000-0008-000000000002', 3, '[DEMO] External alarm siren', 4, 'adet', 60.00, 1800.00, 'de000000-0000-0000-0001-000000000007');

-- ============================================================
-- 11) finance_transactions (15) - last ~3 months
-- ============================================================
-- In this schema:
-- - financial_transactions.amount_try is NET (VAT excluded)
-- - output_vat / input_vat store VAT separately
-- ============================================================

-- Income (8)
INSERT INTO public.financial_transactions
  (id, direction, income_type, amount_original, original_currency, amount_try, should_invoice, output_vat, vat_rate, transaction_date, customer_id, site_id, description, payment_method, subscription_payment_id, work_order_id, sim_card_id, status)
VALUES
  ('de000000-0000-0000-0011-000000000001', 'income', 'subscription', 2500.00, 'TRY', 2500.00, true, 500.00, 20.00, (CURRENT_DATE - interval '40 days')::date, 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000001', '[DEMO] Subscription revenue (Harbor Warehouse A)', 'bank_transfer', 'de000000-0000-0000-0010-000000000005', NULL, NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000002', 'income', 'subscription', 1800.00, 'TRY', 1800.00, true, 360.00, 20.00, (CURRENT_DATE - interval '35 days')::date, 'de000000-0000-0000-0002-000000000002', 'de000000-0000-0000-0003-000000000003', '[DEMO] Subscription revenue (Northview Downtown Lobby)', 'bank_transfer', 'de000000-0000-0000-0010-000000000011', NULL, NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000003', 'income', 'subscription', 4200.00, 'TRY', 4200.00, true, 840.00, 20.00, (CURRENT_DATE - interval '30 days')::date, 'de000000-0000-0000-0002-000000000003', 'de000000-0000-0000-0003-000000000005', '[DEMO] Subscription revenue (BrightMart East Store)', 'bank_transfer', 'de000000-0000-0000-0010-000000000017', NULL, NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000004', 'income', 'subscription', 5200.00, 'TRY', 5200.00, true, 1040.00, 20.00, (CURRENT_DATE - interval '25 days')::date, 'de000000-0000-0000-0002-000000000005', 'de000000-0000-0000-0003-000000000009', '[DEMO] Subscription revenue (Avalon Main Campus)', 'bank_transfer', 'de000000-0000-0000-0010-000000000035', NULL, NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000005', 'income', 'service', 48000.00, 'TRY', 48000.00, true, 9600.00, 20.00, (CURRENT_DATE - interval '65 days')::date, 'de000000-0000-0000-0002-000000000002', 'de000000-0000-0000-0003-000000000003', '[DEMO] Work order revenue (WO3 service)', 'bank_transfer', NULL, 'de000000-0000-0000-0004-000000000003', NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000006', 'income', 'installation', 56000.00, 'TRY', 56000.00, true, 11200.00, 20.00, (CURRENT_DATE - interval '55 days')::date, 'de000000-0000-0000-0002-000000000004', 'de000000-0000-0000-0003-000000000007', '[DEMO] Work order revenue (WO7 installation)', 'bank_transfer', NULL, 'de000000-0000-0000-0004-000000000007', NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000007', 'income', 'sim_rental', 350.00, 'TRY', 350.00, true, 70.00, 20.00, (CURRENT_DATE - interval '20 days')::date, 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000001', '[DEMO] SIM rental income (SIM1)', 'bank_transfer', NULL, NULL, 'de000000-0000-0000-0007-000000000001', 'confirmed'),
  ('de000000-0000-0000-0011-000000000008', 'income', 'subscription', 3900.00, 'TRY', 3900.00, true, 780.00, 20.00, (CURRENT_DATE - interval '15 days')::date, 'de000000-0000-0000-0002-000000000006', 'de000000-0000-0000-0003-000000000011', '[DEMO] Subscription revenue (Ridgeway Campus Offices)', 'bank_transfer', 'de000000-0000-0000-0010-000000000047', NULL, NULL, 'confirmed');

-- Expense (7)
INSERT INTO public.financial_transactions
  (id, direction, income_type, amount_original, original_currency, amount_try, has_invoice, input_vat, vat_rate, transaction_date, customer_id, site_id, description, payment_method, work_order_id, expense_category_id, subscription_payment_id, sim_card_id, status)
VALUES
  ('de000000-0000-0000-0011-000000000009', 'expense', NULL, 900.00, 'TRY', 900.00, false, NULL, NULL, (CURRENT_DATE - interval '40 days')::date, 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000001', '[DEMO] Subscription cogs (Sub1)', 'bank_transfer', NULL, (SELECT id FROM expense_categories WHERE code = 'subscription_cogs' LIMIT 1), 'de000000-0000-0000-0010-000000000005', NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000010', 'expense', NULL, 1600.00, 'TRY', 1600.00, false, NULL, NULL, (CURRENT_DATE - interval '30 days')::date, 'de000000-0000-0000-0002-000000000003', 'de000000-0000-0000-0003-000000000005', '[DEMO] Subscription cogs (Sub3)', 'bank_transfer', NULL, (SELECT id FROM expense_categories WHERE code = 'subscription_cogs' LIMIT 1), 'de000000-0000-0000-0010-000000000017', NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000011', 'expense', NULL, 2400.00, 'TRY', 2400.00, false, NULL, NULL, (CURRENT_DATE - interval '25 days')::date, 'de000000-0000-0000-0002-000000000005', 'de000000-0000-0000-0003-000000000009', '[DEMO] Subscription cogs (Sub6)', 'bank_transfer', NULL, (SELECT id FROM expense_categories WHERE code = 'subscription_cogs' LIMIT 1), 'de000000-0000-0000-0010-000000000035', NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000012', 'expense', NULL, 9000.00, 'TRY', 9000.00, false, NULL, NULL, (CURRENT_DATE - interval '70 days')::date, 'de000000-0000-0000-0002-000000000002', 'de000000-0000-0000-0003-000000000003', '[DEMO] Material cost (WO3)', 'bank_transfer', 'de000000-0000-0000-0004-000000000003', (SELECT id FROM expense_categories WHERE code = 'material' LIMIT 1), NULL, NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000013', 'expense', NULL, 12000.00, 'TRY', 12000.00, false, NULL, NULL, (CURRENT_DATE - interval '60 days')::date, 'de000000-0000-0000-0002-000000000005', 'de000000-0000-0000-0003-000000000010', '[DEMO] Material cost (WO10)', 'bank_transfer', 'de000000-0000-0000-0004-000000000010', (SELECT id FROM expense_categories WHERE code = 'material' LIMIT 1), NULL, NULL, 'confirmed'),
  ('de000000-0000-0000-0011-000000000014', 'expense', NULL, 150.00, 'TRY', 150.00, false, NULL, NULL, (CURRENT_DATE - interval '20 days')::date, 'de000000-0000-0000-0002-000000000001', 'de000000-0000-0000-0003-000000000001', '[DEMO] SIM operator cost (SIM1)', 'bank_transfer', NULL, (SELECT id FROM expense_categories WHERE code = 'sim_operator' LIMIT 1), NULL, 'de000000-0000-0000-0007-000000000001', 'confirmed'),
  ('de000000-0000-0000-0011-000000000015', 'expense', NULL, 220.00, 'TRY', 220.00, false, NULL, NULL, (CURRENT_DATE - interval '18 days')::date, 'de000000-0000-0000-0002-000000000003', 'de000000-0000-0000-0003-000000000005', '[DEMO] SIM operator cost (SIM6)', 'bank_transfer', NULL, (SELECT id FROM expense_categories WHERE code = 'sim_operator' LIMIT 1), NULL, 'de000000-0000-0000-0007-000000000006', 'confirmed');

-- ============================================================
-- 12) site_assets (2-3 assets per site)
-- ============================================================
INSERT INTO public.site_assets
  (id, site_id, equipment_name, quantity, installation_date)
VALUES
  ('de000000-0000-0000-0012-000000000001', 'de000000-0000-0000-0003-000000000003', '[DEMO] NVR 8CH recorder', 1, (CURRENT_DATE - interval '65 days')::date),
  ('de000000-0000-0000-0012-000000000002', 'de000000-0000-0000-0003-000000000003', '[DEMO] 4MP outdoor cameras', 3, (CURRENT_DATE - interval '65 days')::date),
  ('de000000-0000-0000-0012-000000000003', 'de000000-0000-0000-0003-000000000004', '[DEMO] External alarm siren', 1, (CURRENT_DATE - interval '45 days')::date);

COMMIT;

