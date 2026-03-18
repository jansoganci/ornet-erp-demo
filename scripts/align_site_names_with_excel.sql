-- =============================================================================
-- Script: Veritabanı lokasyon isimlerini Excel ile eşitleme
-- Amaç: Abonelik import hatalarını (Lokasyon bulunamadı) gidermek
-- Çalıştırma: Supabase SQL Editor'da çalıştırın
-- Önce: SELECT ile etkilenen kayıtları kontrol edin
-- Sonra: UPDATE/INSERT satırlarının yorumunu kaldırıp çalıştırın
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. GOLBASI ANKARA → PB GOLBASI ANKARA (BOGA GIDA)
-- Excel: PB GOLBASI ANKARA | DB: GOLBASI ANKARA
-- -----------------------------------------------------------------------------
-- Önizleme:
-- SELECT cs.id, c.company_name, cs.site_name AS mevcut, 'PB GOLBASI ANKARA' AS yeni
-- FROM customer_sites cs JOIN customers c ON c.id = cs.customer_id
-- WHERE c.deleted_at IS NULL AND cs.deleted_at IS NULL
--   AND LOWER(TRIM(c.company_name)) LIKE '%boga gida%'
--   AND LOWER(TRIM(cs.site_name)) = 'golbasi ankara';

UPDATE customer_sites
SET site_name = 'PB GOLBASI ANKARA'
WHERE customer_id IN (SELECT id FROM customers WHERE deleted_at IS NULL AND LOWER(TRIM(company_name)) LIKE '%boga gida%')
  AND deleted_at IS NULL
  AND LOWER(TRIM(site_name)) = 'golbasi ankara';


-- -----------------------------------------------------------------------------
-- 2. PB GORUKLE BURSA → PB BURSA GORUKLE (PIZZA BULLS / BOGA GIDA BURSA)
-- Excel: PB BURSA GORUKLE | DB: PB GORUKLE BURSA
-- -----------------------------------------------------------------------------
-- Önizleme:
-- SELECT cs.id, c.company_name, cs.site_name AS mevcut, 'PB BURSA GORUKLE' AS yeni
-- FROM customer_sites cs JOIN customers c ON c.id = cs.customer_id
-- WHERE c.deleted_at IS NULL AND cs.deleted_at IS NULL
--   AND LOWER(TRIM(cs.site_name)) = 'pb gorukle bursa';

UPDATE customer_sites
SET site_name = 'PB BURSA GORUKLE'
WHERE deleted_at IS NULL
  AND LOWER(TRIM(site_name)) = 'pb gorukle bursa';


-- -----------------------------------------------------------------------------
-- 3. SAMANDIRA URETIM DEPO → PB SAMANDIRA DEPO (BOGA GIDA)
-- Excel: PB SAMANDIRA DEPO | DB: SAMANDIRA URETIM DEPO
-- -----------------------------------------------------------------------------
UPDATE customer_sites
SET site_name = 'PB SAMANDIRA DEPO'
WHERE customer_id IN (SELECT id FROM customers WHERE deleted_at IS NULL AND LOWER(TRIM(company_name)) LIKE '%boga gida%')
  AND deleted_at IS NULL
  AND LOWER(TRIM(site_name)) = 'samandira uretim depo';


-- -----------------------------------------------------------------------------
-- 4. HADIMKOY DEPO - INTERNET (yeni lokasyon ekle)
-- Müşteri: ANA BASIN YAYIN GIDA INS.SAN.VE TIC. AS
-- Excel'de var, DB'de yok — HADIMKOY DEPO müşterisine yeni site ekleniyor
-- -----------------------------------------------------------------------------
INSERT INTO customer_sites (customer_id, site_name, address, is_active)
SELECT id, 'HADIMKOY DEPO - INTERNET', '', true
FROM customers
WHERE deleted_at IS NULL
  AND LOWER(TRIM(company_name)) LIKE '%ana basin yayin gida%'
  AND EXISTS (
    SELECT 1 FROM customer_sites cs
    WHERE cs.customer_id = customers.id AND cs.deleted_at IS NULL
      AND LOWER(TRIM(cs.site_name)) = 'hadimkoy depo'
  )
  AND NOT EXISTS (
    SELECT 1 FROM customer_sites cs
    WHERE cs.customer_id = customers.id AND cs.deleted_at IS NULL
      AND LOWER(TRIM(cs.site_name)) = 'hadimkoy depo - internet'
  );


-- -----------------------------------------------------------------------------
-- 5. MERKEZ (yeni lokasyon ekle)
-- Müşteri: BOGA GIDA (BOGA GIDA SAN.VE TIC.AS.)
-- Excel: MERKEZ | DB'de yok
-- -----------------------------------------------------------------------------
INSERT INTO customer_sites (customer_id, site_name, address, is_active)
SELECT id, 'MERKEZ', '', true
FROM customers
WHERE deleted_at IS NULL
  AND LOWER(TRIM(company_name)) LIKE '%boga gida%'
  AND NOT EXISTS (
    SELECT 1 FROM customer_sites cs
    WHERE cs.customer_id = customers.id AND cs.deleted_at IS NULL
      AND LOWER(TRIM(cs.site_name)) = 'merkez'
  );


COMMIT;

-- =============================================================================
-- Çalıştırdıktan sonra kontrol:
-- SELECT c.company_name, cs.site_name
-- FROM customer_sites cs JOIN customers c ON c.id = cs.customer_id
-- WHERE c.deleted_at IS NULL AND cs.deleted_at IS NULL
-- ORDER BY c.company_name, cs.site_name;
-- =============================================================================
