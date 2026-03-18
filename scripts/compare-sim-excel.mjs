#!/usr/bin/env node
/**
 * Compare sim_cards table with Excel import file.
 * Outputs top 20 records where app profit differs most from Excel profit.
 *
 * Usage:
 *   node scripts/compare-sim-excel.mjs <path-to-excel.xlsx>
 *   node scripts/compare-sim-excel.mjs --inspect <path-to-excel.xlsx>   # show Excel structure
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 * Run from project root: cd ornet-erp && node scripts/compare-sim-excel.mjs /full/path/to/file.xlsx
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Load .env.local if present
function loadEnv() {
  const path = '.env.local';
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use service_role key to bypass RLS (sim_cards restricted to admin/accountant)
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function parseCurrency(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).replace(/₺|TL|tl|\s/g, '').replace(',', '.');
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  return Number.isNaN(n) ? null : n;
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('90')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

const headerMap = {
  'HAT NO': 'phone_number',
  'LINE NO': 'phone_number',
  'AYLIK MALIYET': 'cost_price',
  'COST': 'cost_price',
  'AYLIK SATIS FIYAT': 'sale_price',
  'SALES': 'sale_price',
  'SATIS': 'sale_price',
};

function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .replace(/[ıi]/g, 'i')
    .replace(/[şs]/g, 's')
    .replace(/[ğg]/g, 'g')
    .replace(/[üu]/g, 'u')
    .replace(/[öo]/g, 'o')
    .replace(/[çc]/g, 'c');
}

function parseExcel(excelPath) {
  const wb = XLSX.read(readFileSync(excelPath), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  const map = new Map(); // normalized phone -> { hat_no, cost, sale, profit }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowData = {};
    for (const key of Object.keys(row)) {
      const nk = normalizeKey(key);
      for (const [hk, dbKey] of Object.entries(headerMap)) {
        if (nk.includes(normalizeKey(hk))) {
          rowData[dbKey] = row[key];
          break;
        }
      }
    }
    const phone = rowData.phone_number != null ? String(rowData.phone_number).trim() : '';
    if (!phone) continue;

    const cost = parseCurrency(rowData.cost_price);
    const sale = parseCurrency(rowData.sale_price);
    if (cost === null || sale === null) continue;

    const excelCost = cost;
    const excelSale = sale;
    const excelProfit = excelSale - excelCost;
    const norm = normalizePhone(phone);
    if (norm) {
      map.set(norm, {
        hat_no: phone,
        excel_cost: excelCost,
        excel_sale: excelSale,
        excel_profit: excelProfit,
      });
    }
  }
  return map;
}

function inspectExcel(excelPath) {
  const wb = XLSX.read(readFileSync(excelPath), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  const first = rows[0] || {};
  console.log('Sheets:', wb.SheetNames.join(', '));
  console.log('Columns:', Object.keys(first).join(' | '));
  console.log('Row count:', rows.length);
  console.log('First row sample:', JSON.stringify(first, null, 2));
  console.log('\nExpected columns for SIM import: HAT NO (or LINE NO), AYLIK MALIYET (or COST), AYLIK SATIS FIYAT (or SALES)');
}

async function main() {
  const inspect = process.argv[2] === '--inspect';
  const excelPath = process.argv[inspect ? 3 : 2];
  if (!excelPath) {
    console.error('Usage: node scripts/compare-sim-excel.mjs <path-to-excel.xlsx>');
    console.error('       node scripts/compare-sim-excel.mjs --inspect <path>  # check Excel structure');
    process.exit(1);
  }
  const resolvedPath = excelPath.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '');
  if (!existsSync(resolvedPath)) {
    console.error('File not found:', resolvedPath);
    console.error('Tip: Use full path, e.g. /Users/you/Downloads/sim-kartlar.xlsx');
    process.exit(1);
  }

  if (inspect) {
    inspectExcel(resolvedPath);
    return;
  }

  if (!url || !key) {
    console.error('Missing Supabase credentials. Add to .env.local:');
    console.error('  VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
    process.exit(1);
  }

  const excelMap = parseExcel(resolvedPath);
  if (excelMap.size === 0) {
    console.error('No valid rows parsed from Excel. Run with --inspect to check column names.');
    process.exit(1);
  }
  console.error('Parsed', excelMap.size, 'rows from Excel');

  const supabase = createClient(url, key);

  const { data: simCards, error } = await supabase
    .from('sim_cards')
    .select('phone_number, cost_price, sale_price, status')
    .is('deleted_at', null);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  const comparisons = [];
  for (const sim of simCards || []) {
    const norm = normalizePhone(sim.phone_number);
    if (!norm) continue;

    const appCost = Number(sim.cost_price) || 0;
    const appSale = Number(sim.sale_price) || 0;
    const appProfit = appSale - appCost;

    const excelRow = excelMap.get(norm);
    if (!excelRow) continue;

    const excelProfit = excelRow.excel_profit;
    const profitDiff = appProfit - excelProfit;
    comparisons.push({
      hat_no: sim.phone_number,
      app_cost_price: appCost,
      app_sale_price: appSale,
      app_profit: appProfit,
      excel_cost: excelRow.excel_cost,
      excel_sale: excelRow.excel_sale,
      excel_profit: excelProfit,
      profit_diff: profitDiff,
    });
  }

  comparisons.sort((a, b) => Math.abs(b.profit_diff) - Math.abs(a.profit_diff));
  const top20 = comparisons.slice(0, 20);

  if (comparisons.length === 0) {
    console.log('No matching rows (Excel hat_no did not match any sim_cards.phone_number).');
    console.log('Excel rows parsed:', excelMap.size, '| DB SIMs (non-deleted):', simCards?.length ?? 0);
    return;
  }

  console.log('\nTop 20 records where app profit differs most from Excel:\n');
  console.log(
    'hat_no'.padEnd(22) +
      'app_cost'.padStart(10) +
      'app_sale'.padStart(10) +
      'app_profit'.padStart(12) +
      'excel_cost'.padStart(11) +
      'excel_sale'.padStart(11) +
      'excel_profit'.padStart(13) +
      'diff'.padStart(10)
  );
  console.log('-'.repeat(100));

  for (const r of top20) {
    console.log(
      String(r.hat_no).slice(0, 21).padEnd(22) +
        r.app_cost_price.toFixed(2).padStart(10) +
        r.app_sale_price.toFixed(2).padStart(10) +
        r.app_profit.toFixed(2).padStart(12) +
        r.excel_cost.toFixed(2).padStart(11) +
        r.excel_sale.toFixed(2).padStart(11) +
        r.excel_profit.toFixed(2).padStart(13) +
        (r.profit_diff >= 0 ? '+' : '') + r.profit_diff.toFixed(2).padStart(10)
    );
  }

  const totalDiff = comparisons.reduce((s, r) => s + r.profit_diff, 0);
  console.log('\nTotal profit diff (app - excel) across all matched rows:', totalDiff.toFixed(2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
