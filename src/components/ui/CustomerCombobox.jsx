import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check } from 'lucide-react';
import { Spinner } from './Spinner';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useCustomers } from '../../features/customers/hooks';
import { cn } from '../../lib/utils';

/**
 * Searchable customer combobox.
 * Same design as SimCardCombobox / MaterialCombobox - search bar with dropdown results.
 *
 * @param {object} props
 * @param {string} props.value - customer_id (uuid)
 * @param {object|null} props.selectedCustomer - Customer object for display when closed
 * @param {function} props.onChange - (customer_id) => void
 * @param {function} [props.onSelect] - (customer) => void
 * @param {string} [props.label]
 * @param {string} [props.placeholder]
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 */
export function CustomerCombobox({
  value,
  selectedCustomer = null,
  onChange,
  onSelect,
  label,
  placeholder,
  error,
  disabled,
}) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const { data: customers = [], isLoading } = useCustomers({ search: debouncedSearch });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (customer) => {
    onChange?.(customer.id);
    onSelect?.(customer);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange?.(null);
    onSelect?.(null);
    setSearch('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (!val.trim() && value) {
      onChange?.(null);
      onSelect?.(null);
    }
    if (!isOpen && val.length >= 0) setIsOpen(true);
  };

  const handleFocus = () => {
    if (!disabled) setIsOpen(true);
  };

  const displayValue = selectedCustomer?.company_name ?? '';

  const isSelected = (customer) => value === customer.id;

  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder ?? t('combobox.searchCustomer')}
          disabled={disabled}
          className={cn(
            'block w-full h-9 rounded-lg border shadow-sm text-sm transition-colors',
            'placeholder:text-neutral-500 dark:placeholder:text-neutral-600',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'bg-white dark:bg-[#171717] text-neutral-900 dark:text-neutral-50',
            'pl-9 pr-3',
            disabled && 'opacity-60 cursor-not-allowed',
            error
              ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
              : 'border-neutral-300 dark:border-[#262626] focus:border-primary-600 focus:ring-primary-600/20'
          )}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-neutral-400" />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-error-600 dark:text-error-400">{error}</p>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-[#262626] rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 py-1">
            {isLoading ? (
              <div className="p-3 flex justify-center">
                <Spinner size="sm" />
              </div>
            ) : customers.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('combobox.noCustomerFound')}
                </p>
              </div>
            ) : (
              <>
                {value && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800"
                  >
                    {t('combobox.clearSelection')}
                  </button>
                )}
                {customers.map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    className={cn(
                      'w-full px-3 py-2 text-left flex items-center justify-between hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors',
                      isSelected(customer) && 'bg-primary-50 dark:bg-primary-900/30'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(customer);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate block">
                        {customer.company_name}
                      </span>
                      {customer.phone && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    {isSelected(customer) && (
                      <Check className="w-4 h-4 text-primary-600 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
