# Ornet Cashflow v1.0 — Technical & Financial Audit Report

**Date:** 2026-03-23  
**Role:** Senior Financial Systems Engineer / CFO Advisor  
**Scope:** Current Finance Module vs. true Cashflow Management; strategic roadmap for Ornet Cashflow v1.0  

---

## Executive Summary

The Ornet ERP Finance Module has a **strong foundation**: a single-ledger architecture (`financial_transactions`) with automated triggers from subscriptions, proposals, work orders, recurring expenses, and SIM card flows. P&L reporting, VAT tracking, and Collection Desk are operational. However, the system is **100% historical** — there is no projection of future cash flows, no burn rate, and no runway visibility. This report provides a gap analysis, feature mapping, liquidity logic design, integration strategy, and a prioritized implementation roadmap.

---

## 1. Gap Analysis: Current Finance vs. Cashflow Management

### 1.1 What Exists Today

| Capability | Status | Data Source | Notes |
|------------|--------|-------------|-------|
| **Historical transactions** | ✅ | `financial_transactions` | Single source of truth; triggers auto-populate |
| **P&L reporting** | ✅ | `v_profit_and_loss` → ReportsPage | Revenue, COGS, Gross Profit, OpEx, Net Profit |
| **VAT tracking** | ✅ | `financial_transactions` | output_vat, input_vat, vat_rate |
| **MRR** | ✅ | `get_subscription_stats()` | From active subscriptions (base_price + sms_fee + line_fee + …) |
| **Collection Desk** | ✅ | `subscription_payments` (pending) | Overdue + current pending totals |
| **Recurring expense generation** | ✅ | `fn_generate_recurring_expenses` (cron) | Creates pending rows for current month only |
| **Exchange rates** | ✅ | TCMB via `exchange_rates` | Used for USD→TRY conversion |
| **Future inflow projection** | ❌ | — | Not implemented |
| **Future outflow projection** | ❌ | — | Not implemented |
| **Burn rate** | ❌ | — | Not calculated |
| **Runway** | ❌ | — | Requires cash balance (not tracked) |
| **Aging reports (AR/AP)** | ❌ | — | Module 10 not implemented |
| **Bank accounts / cash balance** | ❌ | — | Module 11 not implemented |
| **Forecast vs. actual** | ❌ | — | No expected vs. realized comparison |

### 1.2 Core Gap: Historical Only, No Projection

- **financial_transactions** records **realized** events (payment marked paid, proposal completed, WO completed).
- **subscription_payments** already contains **future** rows (`payment_month` up to 2040, `status = 'pending'`).
- **recurring_expense_templates** describe **future** obligations (amount, day_of_month) but generation is **month-by-month** (cron creates rows only for the current month).

**Conclusion:** We have rich **historical** data and **scheduled** subscription payments. What we lack is a unified view of **expected cash flows** over the next 6–12 months and a comparison to **actual** results.

---

## 2. Feature Mapping: Leveraging Subscriptions for Cash Inflow Forecast

### 2.1 Subscription Payment Schedule as Forecast Source

| Table | Key Columns | Use for Forecast |
|-------|-------------|------------------|
| `subscription_payments` | `payment_month`, `status`, `amount`, `total_amount` | Pending rows = expected inflow by month |
| `subscriptions` | `status`, `billing_frequency` | Exclude `cancelled` and `paused` from forecast |
| `customer_sites` | — | Join for customer context |
| `customers` | — | Join for aging / AR (future) |

### 2.2 Forecast Logic (6–12 Months)

```text
FOR each month M in [current_month .. current_month + 11]:
  expected_inflow[M] = SUM(sp.amount)
    FROM subscription_payments sp
    JOIN subscriptions s ON sp.subscription_id = s.id
    WHERE sp.payment_month = first_day_of(M)
      AND sp.status = 'pending'
      AND s.status = 'active'
```

- `payment_month` is stored as `YYYY-MM-01` (first of month).
- For `billing_frequency = 'monthly'`: one row per month.
- For `3_month` / `6_month` / `yearly`: one row per billing period (amount already multiplied in `generate_subscription_payments`).

**Data availability:** `generate_subscription_payments` (migration 00147) generates rows through **2040-12-01**. No extension RPC needed for 6–12 month horizon.

### 2.3 Edge Cases

| Case | Handling |
|------|----------|
| Subscription cancelled mid-month | Exclude from forecast from cancel date forward |
| Subscription paused | Exclude until reactivated |
| Price revision | `bulk_update_subscription_prices` recalculates; `generate_subscription_payments` is idempotent (ON CONFLICT DO NOTHING) — future rows keep old amounts until regenerated |
| New subscription | `generate_subscription_payments` on create — rows exist immediately |

**Recommendation:** For v1.0, use existing `subscription_payments` rows as-is. Price revision can be Phase 2 (re-generate future payments on price change).

---

## 3. Liquidity Analysis: Burn Rate and Runway

### 3.1 Burn Rate Definition

**Monthly Net Burn** = Total Expenses − Total Income (for a given month)

- Positive burn = net cash outflow (company spends more than it earns).
- Negative burn = net cash inflow (company earns more than it spends).

**Formula (from existing data):**

```sql
-- Monthly net burn (simplified — from financial_transactions)
SELECT period, 
  SUM(CASE WHEN direction = 'income' THEN amount_try ELSE 0 END) AS income,
  SUM(CASE WHEN direction = 'expense' THEN amount_try ELSE 0 END) AS expenses,
  SUM(CASE WHEN direction = 'expense' THEN amount_try ELSE -amount_try END) AS net_burn
FROM financial_transactions
WHERE period >= '2024-01'
GROUP BY period
ORDER BY period DESC;
```

**Average Burn (last N months):**

```text
avg_monthly_burn = AVG(expenses - income) over last 6 months
```

### 3.2 Runway Definition

**Runway (months)** = Cash Balance ÷ |Monthly Burn|

- Requires a **cash balance** input — not stored anywhere today.

**Options for v1.0:**

| Option | Description | Effort |
|--------|-------------|--------|
| A. Manual cash balance | Single config value or dashboard input; user enters current bank balance | Low |
| B. Bank accounts table | `bank_accounts` + opening balance; reconcile manually | Medium (Module 11) |
| C. Derived from transactions | Sum(income) − Sum(expenses) since inception — **inaccurate** (timing, non-cash items) | Not recommended |

**Recommendation:** Start with **Option A** — a single editable "Cash Balance (TRY)" on the Cashflow Dashboard. Phase 2 can introduce `bank_accounts` (Module 11).

### 3.3 Runway Formula (v1.0)

```text
runway_months = cash_balance_manual / ABS(avg_monthly_burn)
```

- If `avg_monthly_burn < 0` (net positive cash flow), runway is "∞" or "N/A — positive cash flow".

---

## 4. Recurring Expenses as Outflow Forecast

### 4.1 Current Behavior

- `recurring_expense_templates`: `amount`, `day_of_month`, `is_active`.
- `fn_generate_recurring_expenses`: Runs daily (cron 01:00 UTC); creates **one** `financial_transactions` row per template **for the current month only**.
- No pre-generation of future months.

### 4.2 Forecast Logic for Next 6–12 Months

```text
FOR each month M in [current_month .. current_month + 11]:
  expected_outflow_recurring[M] = SUM(t.amount)
    FROM recurring_expense_templates t
    WHERE t.is_active = true
```

- Templates are flat monthly amounts. Use `day_of_month` only for display (e.g., "Due day 15").
- Variable templates (`is_variable = true`) — treat as best-effort; could use last 3 months average if history exists.

### 4.3 Combined Forecast

| Month | Expected Inflow (subs) | Expected Outflow (recurring) | Net Forecast |
|-------|------------------------|-----------------------------|--------------|
| M+0 | From `subscription_payments` | From `recurring_expense_templates` | In − Out |
| M+1 | … | … | … |
| … | … | … | … |

**Note:** One-time income/expense (proposals, WOs, manual) is not forecastable at scale. v1.0 focuses on **recurring** patterns.

---

## 5. Integration Strategy: Paraşüt and Invoice Automation

### 5.1 Current Paraşüt Status

Per `docs/archive/completed/SUBSCRIPTIONS_ISSUES.md`:

> Paraşüt accounting integration | **Will not be built.** `parasut_invoice_id` column can remain for potential future use but no integration code will be written.

- `parasut_invoice_id` exists on `financial_transactions` for future use.
- No active development planned for Paraşüt API.

### 5.2 Positioning the Cashflow Module

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ornet ERP (Internal)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Subscriptions│  │ Proposals    │  │ Work Orders         │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────┘   │
│         │                 │                     │              │
│         ▼                 ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ financial_transactions (single source of truth)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ CASHFLOW MODULE (new)                                     │ │
│  │ • Projected inflow (subscription_payments)                │ │
│  │ • Projected outflow (recurring_expense_templates)          │ │
│  │ • Burn rate, runway                                       │ │
│  │ • Forecast vs. actual                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
         │
         │ (future: invoice automation)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Paraşüt / External Accounting                                   │
│  • e-Fatura, e-Arşiv                                             │
│  • Sync parasut_invoice_id when integration exists               │
└─────────────────────────────────────────────────────────────────┘
```

- **Cashflow module sits inside Ornet ERP**, consuming `financial_transactions` and `subscription_payments`.
- **No dependency on Paraşüt** for v1.0.
- When invoice automation is built, it can push invoice IDs to `parasut_invoice_id`; Cashflow stays agnostic.

**Recommendation:** Build Cashflow **now**, before Paraşüt. It uses only internal data and delivers immediate CFO value.

---

## 6. Implementation Recommendation: Prioritized Feature List

### 6.1 Ornet Cashflow v1.0 — Prioritized Features

| # | Feature | Description | Data Source | Effort |
|---|---------|-------------|-------------|--------|
| 1 | **Cashflow Dashboard** | Single page: KPIs + charts | New API | Medium |
| 2 | **Expected Inflow (6–12 months)** | Monthly bars from pending subscription payments | `subscription_payments` | Low |
| 3 | **Expected Outflow (6–12 months)** | Monthly bars from recurring templates | `recurring_expense_templates` | Low |
| 4 | **Burn Rate** | Avg monthly net burn (last 6 months) | `financial_transactions` | Low |
| 5 | **Runway** | cash_balance / burn; manual cash balance input | Config or new table | Low |
| 6 | **Forecast vs. Actual** | Side-by-side chart: expected vs. realized by month | `subscription_payments` + `financial_transactions` | Medium |
| 7 | **Aging Report (AR)** | 30/60/90 day buckets by customer | `subscription_payments` (pending) + `financial_transactions` | Medium |

### 6.2 Phased Roadmap

**Phase 1 — Foundation (4–6 weeks)**  
- [ ] Cashflow Dashboard page (`/finance/cashflow`)  
- [ ] Expected Inflow chart (subscription_payments pending, next 12 months)  
- [ ] Expected Outflow chart (recurring templates × 12 months)  
- [ ] Net Forecast chart (inflow − outflow by month)  
- [ ] Manual "Cash Balance (TRY)" setting (new table `cashflow_settings` or env/config)  

**Phase 2 — Liquidity (2–3 weeks)**  
- [ ] Burn Rate KPI (last 6 months avg)  
- [ ] Runway KPI (cash_balance / burn)  
- [ ] Historical net cash flow table (monthly)  

**Phase 3 — Forecast vs. Actual (2–3 weeks)**  
- [ ] Compare expected subscription revenue (from pending→paid) vs. actual `financial_transactions` income per month  
- [ ] Variance chart (expected − actual)  
- [ ] Export (CSV) for cashflow report  

**Phase 4 — Aging (optional, 2–3 weeks)**  
- [ ] AR Aging: overdue pending subscription payments by customer (0–30, 31–60, 61–90+ days)  
- [ ] Collection desk already has overdue list; extend with aging buckets  

### 6.3 Build Now vs. After Paraşüt

| Option | Pros | Cons |
|--------|------|------|
| **Build now** | Immediate value; no external dependency; uses existing data | None significant |
| **Wait for Paraşüt** | Could align invoice status with cash | Paraşüt explicitly not planned; delays CFO visibility |

**Recommendation: Build now.** Cashflow v1.0 is fully derivable from internal data. Paraşüt, when added, will enhance invoice tracking, not core cashflow projection.

---

## 7. Technical Appendices

### 7.1 RPC Sketch: Expected Subscription Inflow by Month

```sql
CREATE OR REPLACE FUNCTION get_expected_subscription_inflow(p_months INTEGER DEFAULT 12)
RETURNS TABLE (period TEXT, expected_net NUMERIC, expected_gross NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_end   DATE := v_start + (p_months || ' months')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT
    to_char(sp.payment_month, 'YYYY-MM') AS period,
    SUM(sp.amount)::NUMERIC AS expected_net,
    SUM(sp.total_amount)::NUMERIC AS expected_gross
  FROM subscription_payments sp
  JOIN subscriptions s ON sp.subscription_id = s.id
  WHERE sp.payment_month >= v_start
    AND sp.payment_month < v_end
    AND sp.status = 'pending'
    AND s.status = 'active'
  GROUP BY to_char(sp.payment_month, 'YYYY-MM')
  ORDER BY 1;
END;
$$;
```

### 7.2 RPC Sketch: Expected Recurring Outflow by Month

```sql
CREATE OR REPLACE FUNCTION get_expected_recurring_outflow(p_months INTEGER DEFAULT 12)
RETURNS TABLE (period TEXT, expected_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base   DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_amount NUMERIC;
  i        INTEGER;
BEGIN
  FOR i IN 0..(p_months - 1) LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_amount
    FROM recurring_expense_templates
    WHERE is_active = true;
    period := to_char(v_base + (i || ' months')::INTERVAL, 'YYYY-MM');
    expected_amount := v_amount;
    RETURN NEXT;
  END LOOP;
END;
$$;
```

### 7.3 Burn Rate Query (from financial_transactions)

```sql
SELECT
  ROUND(AVG(expenses - income)::NUMERIC, 2) AS avg_monthly_burn,
  COUNT(*) AS months_used
FROM (
  SELECT period,
    SUM(CASE WHEN direction = 'income' THEN amount_try ELSE 0 END) AS income,
    SUM(CASE WHEN direction = 'expense' THEN amount_try ELSE 0 END) AS expenses
  FROM financial_transactions
  WHERE period >= to_char(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM')
  GROUP BY period
) x;
```

---

## 8. Summary

| Question | Answer |
|----------|--------|
| **Do we have Future Projections?** | No. We have scheduled subscription payments (future) and recurring templates (future), but no unified projection view. |
| **Can we forecast from subscriptions?** | Yes. `subscription_payments` (pending, active subs) gives 6–12 month inflow forecast directly. |
| **Burn rate & runway?** | Burn: derivable from `financial_transactions`. Runway: needs manual cash balance input (v1.0). |
| **Paraşüt / Invoice Automation?** | Not planned. Cashflow module is independent; build now. |
| **Recommended first release?** | Phase 1 + Phase 2 (Dashboard, inflow/outflow forecast, burn rate, runway). |

---

**Document Status:** Living document. Update as implementation progresses.  
**Next Step:** Approve roadmap, then implement Phase 1 RPCs and Cashflow Dashboard UI.
