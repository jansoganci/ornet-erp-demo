-- Migration: 00136_service_type_tur_codes
-- Description: Replace generic service_type values with 12 TÜR codes.
-- Do not modify unique index or column type.

-- Step 1: Drop old CHECK constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_service_type_check;

-- Step 2: Migrate existing rows (before adding new constraint)
UPDATE subscriptions SET service_type = 'A.KIRA.KK' WHERE service_type = 'alarm_only';
UPDATE subscriptions SET service_type = 'K.KIRA.KK' WHERE service_type = 'camera_only';
UPDATE subscriptions SET service_type = 'INT.AYLIK.KK' WHERE service_type = 'internet_only';
UPDATE subscriptions SET service_type = NULL WHERE service_type IN ('alarm_camera', 'alarm_camera_internet', 'camera_internet');

-- Step 3: Add new CHECK constraint with 12 values
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_service_type_check
  CHECK (service_type IS NULL OR service_type IN (
    'A.KIRA.KK', 'A.KIRA.ELDEN', 'A.KIRA.ELDEN.MET', 'A.KIRA.BANKA',
    'A.S.ALMA', 'A.S.ALMA.YILLIK', 'A.S.ALMA.BANKA',
    'INT.AYLIK.KK', 'INT.AYLIK.BANKA', 'INT.YILLIK',
    'K.KIRA.KK', 'K.KIRA.BANKA'
  ));
