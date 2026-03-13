import * as XLSX from 'xlsx';
import { SUBSCRIPTION_TYPES, SERVICE_TYPES } from './schema';

/**
 * Excel column headers (Turkish) — matches the user's actual Excel format.
 * Removed: ADET, ADRES (not needed without auto-create), KAM.ALR.VAR MI (redundant with TÜR),
 *          ÖNCEKİ AYLARIN NOTLARI (merged into ACIKLAMA), KDV (hardcoded 20%),
 *          Banka Adı / Son 4 (security risk), Fatura Günü (defaults to 1).
 */
export const TEMPLATE_HEADERS = [
  'TÜR',
  'MERKEZ',
  'ACC.',
  'MÜŞTERİ',
  'LOKASYON',
  'ABONE UNVANI',
  'HESAP NO',
  'BAŞLANGIÇ',
  'TL',
  'SMS TL',
  'HAT TL',
  'MALIYET',
  'ODEME SIKLIGI',
  'ABONELİK TİPİ',
  'FATURA',
  'ACIKLAMA',
];

const MAX_ROWS = 500;

// TÜR (service_type) mapping — Turkish Excel values → DB enum
const SERVICE_TYPE_MAP = {
  'alarm':                   'alarm_only',
  'kamera':                  'camera_only',
  'internet':                'internet_only',
  'alarm ve kamera':         'alarm_camera',
  'alarm + kamera':          'alarm_camera',
  'alarm kamera':            'alarm_camera',
  'alarm, kamera':           'alarm_camera',
  'alarm, kamera, internet': 'alarm_camera_internet',
  'alarm+kamera+internet':   'alarm_camera_internet',
  'kamera ve internet':      'camera_internet',
  'kamera internet':         'camera_internet',
  // English passthrough
  'alarm_only':              'alarm_only',
  'camera_only':             'camera_only',
  'internet_only':           'internet_only',
  'alarm_camera':            'alarm_camera',
  'alarm_camera_internet':   'alarm_camera_internet',
  'camera_internet':         'camera_internet',
};

// ABONELİK TİPİ (subscription_type) mapping
const SUBSCRIPTION_TYPE_MAP = {
  nakit:           'manual_cash',
  havale:          'manual_bank',
  kart:            'recurring_card',
  manual_cash:     'manual_cash',
  manual_bank:     'manual_bank',
  recurring_card:  'recurring_card',
};

// ODEME SIKLIGI (billing_frequency) mapping
const BILLING_FREQUENCY_MAP = {
  'aylık':    'monthly',
  'aylik':    'monthly',
  'monthly':  'monthly',
  '3 aylık':  '3_month',
  '3 aylik':  '3_month',
  '3_aylık':  '3_month',
  '3_aylik':  '3_month',
  '3_month':  '3_month',
  '6 aylık':  '6_month',
  '6 aylik':  '6_month',
  '6_aylık':  '6_month',
  '6_aylik':  '6_month',
  '6_month':  '6_month',
  'yıllık':   'yearly',
  'yillik':   'yearly',
  'yearly':   'yearly',
};

// FATURA (official_invoice) mapping
const OFFICIAL_INVOICE_MAP = {
  evet:   true,
  hayır:  false,
  hayir:  false,
  true:   true,
  false:  false,
  '1':    true,
  '0':    false,
};

function trim(val) {
  if (val == null) return '';
  return String(val).trim();
}

function parseDate(val) {
  const s = trim(val);
  if (!s) return null;
  // YYYY-MM-DD
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(s)) return s;
  // DD.MM.YYYY
  const dmy = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function toNum(val, defaultVal = 0) {
  if (val == null || trim(String(val)) === '') return defaultVal;
  const n = Number(String(val).replace(',', '.'));
  return Number.isFinite(n) ? n : defaultVal;
}

/**
 * Parse .xlsx file buffer into array of row objects (keys = first row headers)
 */
export function parseXlsxFile(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const ws = wb.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!data.length) return [];
  const headers = data[0].map((h) => trim(h));
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const arr = data[i];
    // Skip completely empty rows
    if (arr.every((v) => v === '' || v == null)) continue;
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = arr[j] != null ? arr[j] : '';
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Validate and map Excel rows to internal payload objects.
 * Max 500 rows. Customer/site existence is NOT checked here — that happens in importApi.
 * Returns { rows, errors } where errors are { rowIndex, field, message, rowNum }.
 */
export function validateAndMapRows(excelRows) {
  const errors = [];
  const rows = [];

  if (excelRows.length > MAX_ROWS) {
    errors.push({ rowIndex: -1, field: '_limit', message: 'MAX_ROWS' });
  }

  const toProcess = excelRows.slice(0, MAX_ROWS);

  toProcess.forEach((raw, rowIndex) => {
    const rowNum = rowIndex + 2; // 1-based + header row
    const get = (key) => trim(raw[key] ?? '');

    const company_name = get('MÜŞTERİ');
    const site_name    = get('LOKASYON');
    const startRaw     = get('BAŞLANGIÇ');
    const base_priceRaw = get('TL');
    const subTypeRaw   = get('ABONELİK TİPİ');

    // Required field validation
    if (!company_name) errors.push({ rowIndex, field: 'MÜŞTERİ',     message: 'required', rowNum });
    if (!site_name)    errors.push({ rowIndex, field: 'LOKASYON',     message: 'required', rowNum });
    if (!startRaw)     errors.push({ rowIndex, field: 'BAŞLANGIÇ',    message: 'required', rowNum });
    if (!subTypeRaw)   errors.push({ rowIndex, field: 'ABONELİK TİPİ', message: 'required', rowNum });

    const start_date = parseDate(startRaw);
    if (startRaw && !start_date) errors.push({ rowIndex, field: 'BAŞLANGIÇ', message: 'invalid_date', rowNum });

    const base_price = toNum(base_priceRaw, NaN);
    if (base_priceRaw !== '' && !Number.isFinite(base_price))
      errors.push({ rowIndex, field: 'TL', message: 'invalid_number', rowNum });
    if (Number.isFinite(base_price) && base_price < 0)
      errors.push({ rowIndex, field: 'TL', message: 'min_zero', rowNum });

    const subTypeLower   = subTypeRaw.toLowerCase();
    const subscription_type = SUBSCRIPTION_TYPE_MAP[subTypeLower] ?? null;
    if (subTypeRaw && !subscription_type)
      errors.push({ rowIndex, field: 'ABONELİK TİPİ', message: 'invalid_type', rowNum });

    // TÜR (service_type) — optional but validated if provided
    const turRaw = get('TÜR').toLowerCase().trim();
    const service_type = turRaw ? (SERVICE_TYPE_MAP[turRaw] ?? null) : null;
    if (turRaw && !service_type)
      errors.push({ rowIndex, field: 'TÜR', message: 'invalid_service_type', rowNum });

    // Billing frequency — default monthly
    const freqRaw = get('ODEME SIKLIGI').toLowerCase().trim();
    const billing_frequency = BILLING_FREQUENCY_MAP[freqRaw] ?? 'monthly';

    // Official invoice — default true
    const faturaRaw = get('FATURA').toLowerCase().trim();
    const official_invoice = OFFICIAL_INVOICE_MAP[faturaRaw] !== undefined
      ? OFFICIAL_INVOICE_MAP[faturaRaw]
      : true;

    rows.push({
      company_name,
      site_name,
      subscriber_title:      get('ABONE UNVANI') || null,
      alarm_center:          get('MERKEZ') || null,
      alarm_center_account:  get('ACC.') || null,
      account_no:            get('HESAP NO') || null,
      start_date:            start_date ?? startRaw,
      base_price:            Number.isFinite(base_price) ? base_price : 0,
      sms_fee:               toNum(get('SMS TL'), 0),
      line_fee:              toNum(get('HAT TL'), 0),
      cost:                  toNum(get('MALIYET'), 0),
      vat_rate:              20, // hardcoded — strict 20% per business rule
      billing_frequency,
      subscription_type,
      service_type,
      official_invoice,
      notes:                 get('ACIKLAMA') || null,
    });
  });

  return { rows, errors };
}

/**
 * Build template sheet (headers + one example row) and return as Blob for download.
 */
export function buildTemplateBlob() {
  const exampleRow = [
    'alarm',        // TÜR
    'Güvenlik A.Ş.',// MERKEZ
    'ACC-001',      // ACC.
    'Örnek Firma',  // MÜŞTERİ
    'Merkez Şube',  // LOKASYON
    'Alarm+Kamera Abonesi', // ABONE UNVANI
    'GSM-001',      // HESAP NO
    '2024-01-01',   // BAŞLANGIÇ
    '500',          // TL
    '50',           // SMS TL
    '0',            // HAT TL
    '100',          // MALIYET
    'aylık',        // ODEME SIKLIGI
    'nakit',        // ABONELİK TİPİ
    'evet',         // FATURA
    '',             // ACIKLAMA
  ];
  const wsData = [TEMPLATE_HEADERS, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Column widths
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Abonelikler');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export const MAX_IMPORT_ROWS = MAX_ROWS;
