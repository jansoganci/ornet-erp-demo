import * as XLSX from 'xlsx';

export const COLUMN_REGION_MAP = {
  A: 'istanbul_europe',
  D: 'istanbul_anatolia',
  F: 'outside_istanbul',
};

export const TEMPLATE_HEADERS = {
  A1: 'ISTANBUL AVRUPA',
  D1: 'ISTANBUL ANADOLU',
  F1: 'SEHIR DISI',
};

const MAX_IMPORT_ROWS = 1000;
const COLUMN_INDEX_MAP = {
  0: 'istanbul_europe',
  3: 'istanbul_anatolia',
  5: 'outside_istanbul',
};

const HEADER_VALUES = new Set(Object.values(TEMPLATE_HEADERS).map((value) => value.trim().toUpperCase()));

function trimCell(value) {
  if (value == null) return '';
  return String(value).replace(/\r/g, '\n').split('\n').map((part) => part.trim()).filter(Boolean).join(' ');
}

function isTemplateHeader(value) {
  return HEADER_VALUES.has(trimCell(value).toUpperCase());
}

export function parseOperationsWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const parsedRows = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    Object.entries(COLUMN_INDEX_MAP).forEach(([columnIndexText, region]) => {
      const columnIndex = Number(columnIndexText);
      const description = trimCell(row?.[columnIndex]);
      if (!description || isTemplateHeader(description)) return;

      parsedRows.push({
        rowNum: rowIndex + 1,
        columnIndex,
        region,
        description,
      });
    });
  }

  return parsedRows;
}

export function validateAndMapImportRows(parsedRows) {
  const errors = [];

  if (parsedRows.length > MAX_IMPORT_ROWS) {
    errors.push({ rowNum: 0, field: '_limit', message: 'MAX_ROWS', rowIndex: -1 });
    return { rows: [], errors };
  }

  const rows = parsedRows.map((row, rowIndex) => ({
    rowNum: row.rowNum,
    rowIndex,
    region: row.region,
    description: row.description,
    customer_id: null,
    site_id: null,
    status: 'open',
    priority: 'normal',
    work_type: 'other',
  }));

  return { rows, errors };
}

export function buildTemplateBlob() {
  const ws = XLSX.utils.aoa_to_sheet([]);
  ws.A1 = { t: 's', v: TEMPLATE_HEADERS.A1 };
  ws.D1 = { t: 's', v: TEMPLATE_HEADERS.D1 };
  ws.F1 = { t: 's', v: TEMPLATE_HEADERS.F1 };
  ws.A2 = { t: 's', v: 'Alarm paneli haberlesmiyor' };
  ws.D2 = { t: 's', v: 'Kesif talebi var, ara' };
  ws.F2 = { t: 's', v: 'Bursa sube uzaktan destek' };
  ws['!cols'] = [
    { wch: 34 },
    { wch: 4 },
    { wch: 4 },
    { wch: 34 },
    { wch: 4 },
    { wch: 34 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Operasyon Havuzu');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export { MAX_IMPORT_ROWS };
