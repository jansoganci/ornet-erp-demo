import { supabase } from '../../lib/supabase';
import { createSubscription } from './api';

/**
 * Look up customer by exact company_name (case-insensitive trim).
 * Returns id or null — NEVER creates.
 */
async function findCustomer(companyName) {
  const name = String(companyName).trim();
  if (!name) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .ilike('company_name', name)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Look up site by customer_id + site_name (case-insensitive trim).
 * Returns id or null — NEVER creates.
 */
async function findSite(customerId, siteName) {
  const name = String(siteName).trim();
  if (!customerId || !name) return null;
  const { data, error } = await supabase
    .from('customer_sites')
    .select('id')
    .eq('customer_id', customerId)
    .ilike('site_name', name)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Import subscriptions from validated rows.
 *
 * STRICT MODE — no auto-creation of customers or sites.
 * If a customer or site is not found in the DB, the row is flagged as an error
 * and skipped. All other valid rows continue to be processed.
 *
 * @param {Array} rows — validated rows from validateAndMapRows()
 * @returns {{ created: number, failed: number, errors: Array<{row, message}> }}
 */
export async function importSubscriptionsFromRows(rows) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Cache lookups to avoid redundant DB round-trips within the same import
  const customerCache = {};
  const siteCache = {};

  let created = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // matches Excel row number (1-based + header)

    try {
      // --- Customer lookup (strict) ---
      if (!(row.company_name in customerCache)) {
        customerCache[row.company_name] = await findCustomer(row.company_name);
      }
      const customerId = customerCache[row.company_name];

      if (!customerId) {
        errors.push({
          row: rowNum,
          message: 'Müşteri veya Lokasyon bulunamadı. Lütfen önce Müşteri kaydını oluşturun.',
        });
        continue;
      }

      // --- Site lookup (strict) ---
      const siteCacheKey = `${customerId}|${row.site_name}`;
      if (!(siteCacheKey in siteCache)) {
        siteCache[siteCacheKey] = await findSite(customerId, row.site_name);
      }
      const siteId = siteCache[siteCacheKey];

      if (!siteId) {
        errors.push({
          row: rowNum,
          message: 'Müşteri veya Lokasyon bulunamadı. Lütfen önce Müşteri kaydını oluşturun.',
        });
        continue;
      }

      // --- Build subscription payload ---
      const payload = {
        site_id:               siteId,
        subscription_type:     row.subscription_type,
        start_date:            row.start_date,
        billing_day:           1,
        base_price:            row.base_price,
        sms_fee:               row.sms_fee ?? 0,
        line_fee:              row.line_fee ?? 0,
        cost:                  row.cost ?? 0,
        vat_rate:              20,
        currency:              'TRY',
        billing_frequency:     row.billing_frequency ?? 'monthly',
        service_type:          row.service_type ?? null,
        official_invoice:      row.official_invoice !== false,
        notes:                 row.notes ?? null,
        // New fields
        subscriber_title:      row.subscriber_title ?? null,
        alarm_center:          row.alarm_center ?? null,
        alarm_center_account:  row.alarm_center_account ?? null,
        // account_no is on the site — pass through if the create logic ever supports it
      };

      await createSubscription(payload);
      created++;
    } catch (err) {
      errors.push({ row: rowNum, message: err?.message || String(err) });
    }
  }

  return { created, failed: errors.length, errors };
}
