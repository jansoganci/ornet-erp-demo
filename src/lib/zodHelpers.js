import { z } from 'zod';
import i18n from './i18n';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Required ISO date string — accepts "YYYY-MM-DD", rejects empty/undefined.
 * Replaces bare z.string().min(1, ...) on date fields.
 */
export const isoDateString = () =>
  z
    .string()
    .min(1, i18n.t('errors:validation.required'))
    .regex(ISO_DATE_RE, i18n.t('errors:validation.invalidDate'));

/**
 * Optional ISO date string — accepts "YYYY-MM-DD", '' (empty), or undefined.
 * Validates format only when a non-empty value is present.
 * Replaces z.string().optional().or(z.literal('')) on date fields.
 */
export const isoDateStringOptional = () =>
  z.union([
    z.string().regex(ISO_DATE_RE, i18n.t('errors:validation.invalidDate')),
    z.literal(''),
    z.undefined(),
  ]).optional();

/**
 * Currency enum — validates that the value is one of the app's supported currencies.
 * Replaces z.string().default('...') on currency fields.
 * Chain .default('TRY') or .default('USD') after calling this helper.
 */
export const currencyEnum = (currencies = ['TRY', 'USD']) =>
  z.enum(currencies);
