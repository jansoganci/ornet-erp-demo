# FATURA (official_invoice) Field Reference

## 1. Is there a "FATURA" field in the database?

**Yes.** The database column is `official_invoice` (BOOLEAN, NOT NULL, default true).

- **Table:** `subscriptions`
- **Migration:** `00022_subscription_target_fields.sql`
- **Column:** `official_invoice BOOLEAN NOT NULL DEFAULT true`

---

## 2. Is it supported in the Excel importer?

**Yes.** The Excel column header is `FATURA`. It maps to `official_invoice`.

- **File:** `src/features/subscriptions/importUtils.js`
- **Mapping:** `OFFICIAL_INVOICE_MAP` (see accepted values below)

---

## 3. Is it shown in the subscription table UI?

**Yes.** It appears in:

- **Subscription Detail Page** — Payment Method card: "Resmi Fatura" / "Gayri Resmi" badge
- **Subscription Form Page** — Toggle/checkbox for official invoice

It is **not** shown as a column in the Subscriptions List table.

---

## 4. Accepted values for the Excel column

| Excel value (case-insensitive) | Result |
|--------------------------------|--------|
| `evet` | true |
| `hayır`, `hayir` | false |
| `true` | true |
| `false` | false |
| `1` | true |
| `0` | false |

**Default:** If the cell is empty or contains an unrecognized value, it defaults to **true** (resmi fatura).

---

## Summary

- **DB:** `subscriptions.official_invoice` (BOOLEAN)
- **Excel:** Column header `FATURA`
- **UI:** Detail page badge, form toggle
- **Values:** evet/hayır, 1/0, true/false (case-insensitive)
