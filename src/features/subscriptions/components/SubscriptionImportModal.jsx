import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Modal, Button, Spinner } from '../../../components/ui';
import { parseXlsxFile, validateAndMapRows, buildTemplateBlob } from '../importUtils';
import { useImportSubscriptions } from '../hooks';

const PREVIEW_ROWS = 20;
const MAX_VISIBLE_ERRORS = 50;

function translateErrorCode(t, code) {
  const key = `import.errorCodes.${code}`;
  const translated = t(key, { defaultValue: '' });
  return translated || code;
}

function ValidationErrorTable({ errors, t }) {
  const fieldErrors = errors.filter((e) => e.rowIndex >= 0);
  if (fieldErrors.length === 0) return null;

  const visibleErrors = fieldErrors.slice(0, MAX_VISIBLE_ERRORS);

  return (
    <div className="border border-amber-200 dark:border-amber-900/50 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200 dark:border-amber-900/50">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          {t('import.validationErrors')} ({fieldErrors.length})
        </h4>
      </div>
      <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-amber-100/50 dark:bg-amber-950/30 sticky top-0">
            <tr>
              <th className="text-left px-3 py-1.5 font-semibold text-amber-800 dark:text-amber-300 w-16">
                {t('import.errorTableHeaders.row')}
              </th>
              <th className="text-left px-3 py-1.5 font-semibold text-amber-800 dark:text-amber-300 w-32">
                {t('import.errorTableHeaders.field')}
              </th>
              <th className="text-left px-3 py-1.5 font-semibold text-amber-800 dark:text-amber-300">
                {t('import.errorTableHeaders.error')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleErrors.map((err, i) => (
              <tr key={i} className="border-t border-amber-200/50 dark:border-amber-900/30">
                <td className="px-3 py-1.5 text-amber-700 dark:text-amber-400 font-mono text-xs">
                  {err.rowNum}
                </td>
                <td className="px-3 py-1.5 text-amber-800 dark:text-amber-300 font-medium text-xs">
                  {err.field}
                </td>
                <td className="px-3 py-1.5 text-amber-700 dark:text-amber-400 text-xs">
                  {translateErrorCode(t, err.message)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fieldErrors.length > MAX_VISIBLE_ERRORS && (
        <p className="text-xs text-amber-600 dark:text-amber-500 px-3 py-1.5 border-t border-amber-200 dark:border-amber-900/50">
          +{fieldErrors.length - MAX_VISIBLE_ERRORS} ...
        </p>
      )}
    </div>
  );
}

function ImportErrorTable({ errors, t }) {
  if (!errors?.length) return null;

  return (
    <div className="border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50/50 dark:bg-red-950/20">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-red-200 dark:border-red-900/50">
        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
          {t('import.importErrors')} ({errors.length})
        </h4>
      </div>
      <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-100/50 dark:bg-red-950/30 sticky top-0">
            <tr>
              <th className="text-left px-3 py-1.5 font-semibold text-red-800 dark:text-red-300 w-16">
                {t('import.errorTableHeaders.row')}
              </th>
              <th className="text-left px-3 py-1.5 font-semibold text-red-800 dark:text-red-300">
                {t('import.errorTableHeaders.error')}
              </th>
            </tr>
          </thead>
          <tbody>
            {errors.map((err, i) => (
              <tr key={i} className="border-t border-red-200/50 dark:border-red-900/30">
                <td className="px-3 py-1.5 text-red-700 dark:text-red-400 font-mono text-xs">
                  {err.row}
                </td>
                <td className="px-3 py-1.5 text-red-700 dark:text-red-400 text-xs">
                  {err.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SubscriptionImportModal({ open, onClose }) {
  const { t } = useTranslation('subscriptions');
  const [rows, setRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importResult, setImportResult] = useState(null);

  const importMutation = useImportSubscriptions();

  const handleDownloadTemplate = useCallback(() => {
    const blob = buildTemplateBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abonelik_sablonu.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = parseXlsxFile(event.target.result);
        const { rows: validated, errors } = validateAndMapRows(data);
        setRows(validated);
        setValidationErrors(errors);
      } catch (err) {
        setRows([]);
        setValidationErrors([{ rowIndex: -1, field: '_parse', message: err?.message || 'Parse error', rowNum: 0 }]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, []);

  const handleImport = useCallback(async () => {
    if (rows.length === 0 || validationErrors.length > 0) return;
    setImportResult(null);
    try {
      const result = await importMutation.mutateAsync(rows);
      setImportResult(result);
      if (result.failed === 0) {
        setTimeout(() => onClose(), 2000);
      }
    } catch {
      // toast already in hook
    }
  }, [rows, validationErrors.length, importMutation, onClose]);

  const hasLimitError = validationErrors.some((e) => e.field === '_limit');
  const onlyLimitError = hasLimitError && validationErrors.length === 1;
  const canImport = rows.length > 0 && (validationErrors.length === 0 || onlyLimitError);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('import.title')}
      size="xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose}>
            {importResult ? t('common:actions.close') : t('common:actions.cancel')}
          </Button>
          {!importResult && canImport && (
            <Button
              onClick={handleImport}
              loading={importMutation.isPending}
              leftIcon={importMutation.isPending ? <Spinner size="sm" /> : null}
            >
              {t('import.importButton')}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate} leftIcon={<Download className="w-4 h-4" />}>
            {t('import.downloadTemplate')}
          </Button>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#171717] cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <Upload className="w-4 h-4" />
            {t('import.selectFile')}
            <input type="file" accept=".xlsx" className="sr-only" onChange={handleFileChange} />
          </label>
        </div>

        {hasLimitError && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('import.limitError')}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                {t('import.preview')} — {t('import.totalRows', { count: rows.length })}
              </h4>
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-semibold text-neutral-700 dark:text-neutral-300">#</th>
                      <th className="text-left p-2 font-semibold text-neutral-700 dark:text-neutral-300">Müşteri</th>
                      <th className="text-left p-2 font-semibold text-neutral-700 dark:text-neutral-300">Lokasyon</th>
                      <th className="text-left p-2 font-semibold text-neutral-700 dark:text-neutral-300">Abone Ünvanı</th>
                      <th className="text-left p-2 font-semibold text-neutral-700 dark:text-neutral-300">TÜR</th>
                      <th className="text-left p-2 font-semibold text-neutral-700 dark:text-neutral-300">Başlangıç</th>
                      <th className="text-right p-2 font-semibold text-neutral-700 dark:text-neutral-300">Kiralama</th>
                      <th className="text-right p-2 font-semibold text-neutral-700 dark:text-neutral-300">SIM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                      <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="p-2 text-neutral-500">{i + 2}</td>
                        <td className="p-2">{row.company_name}</td>
                        <td className="p-2">{row.site_name}</td>
                        <td className="p-2 text-neutral-500 text-xs">{row.subscriber_title || '—'}</td>
                        <td className="p-2">{row.service_type || '—'}</td>
                        <td className="p-2">{row.start_date}</td>
                        <td className="p-2 text-right">{row.base_price}</td>
                        <td className="p-2 text-right">{row.sim_amount ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > PREVIEW_ROWS && (
                <p className="text-xs text-neutral-500 mt-1">
                  {t('import.previewRows', { count: PREVIEW_ROWS })}
                </p>
              )}
            </div>

            <ValidationErrorTable errors={validationErrors} t={t} />
          </>
        )}

        {importResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              importResult.failed === 0
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700'
            }`}>
              <div className="flex items-center gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {t('import.summaryTitle')}
                  </h4>
                  {importResult.failed === 0 ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      {t('import.success', { created: importResult.created })}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {t('import.partialSuccess', { created: importResult.created, failed: importResult.failed })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <ImportErrorTable errors={importResult.errors} t={t} />
          </div>
        )}

        {!rows.length && !importResult && (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
            <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t('import.selectFile')} (.xlsx, {t('import.limitError')})</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
