# Table.jsx — Tablet Card Refactor Plan

> Focus: tablet (768px–1024px) only. Mobile and desktop unchanged.

---

## 1. Risk Assessment

### What could break on mobile?
- **Low risk.** Only `md:`-prefixed classes are added. At `<768px` all new classes are no-ops; layout stays `grid-cols-1`, single column.
- **Safeguard:** Keep base layout `grid-cols-1 gap-4`; tablet overrides via `md:grid-cols-2 md:gap-x-6` on the card content only.

### What could break on desktop?
- **None.** Desktop uses `hidden lg:block` — a separate DOM subtree. No changes to lines 76–169.

### What could break on tablet?
- **Layout:** Splitting columns into primary/meta could mis-group if a page has non-standard column order (e.g. actions first). Mitigated by `column.cardSection` override.
- **Custom renders:** `column.render(value, item, rowIndex)` stays identical. Only the parent wrapper changes (grid vs block).
- **Wide content:** Badges, flex rows, or long text in `column.render` might wrap differently inside a narrower `min-w-0` cell. We add `min-w-0` only to section containers, not to individual cells, to avoid forcing truncation on custom UI.

### What is safe to change?
- Card inner layout: add `md:grid md:grid-cols-2` with primary/meta sections
- Add `md:gap-x-6 md:gap-y-2` for tablet spacing
- Add `min-w-0` to section wrappers (overflow containment)
- Introduce optional `column.cardSection: 'primary' | 'meta'`; default heuristic when unset

---

## 2. Recommended Minimal Refactor Strategy

1. **Only change the card block** (lines 48–72). Desktop block is untouched.
2. **Add optional `column.cardSection`:** `'primary'` → left block, `'meta'` → right block. If unset, use heuristic: first 2 columns primary, rest meta.
3. **Tablet layout:** At `md:`, card content becomes a 2-column grid:
   - Left: primary columns
   - Right: meta columns, `md:justify-end` so status/badges align right
4. **No truncate on generic wrapper** — custom `column.render` may return badges, icons, dropdowns; truncating the wrapper could break them.
5. **Preserve all:** `column.render()`, `rowClassName`, `alignClasses`, dark mode, `keyExtractor`.

---

## 3. Optional Extension

```js
// column.cardSection: 'primary' | 'meta' | undefined
// - 'primary': always in left block
// - 'meta': always in right block
// - undefined: heuristic (first 2 primary, rest meta)
```

Pages with unusual column order can set `cardSection` per column. No page changes required for the default heuristic to apply.

---

## 4. Test Checklist

| Device   | Breakpoint | Test |
|----------|------------|------|
| Mobile   | 320px–767px | Cards single column; all fields readable; tap opens detail |
| Tablet   | 768px–1023px | Cards show 2-column layout; primary left, meta right; no horizontal scroll; tap works |
| Desktop  | 1024px+      | Table view; no card view; columns align; row click works |

**Pages to spot-check:** CustomersListPage, WorkOrdersListPage, ProposalsListPage, SubscriptionsListPage, SimCardsListPage.

---

## 5. Implementation Summary (Applied)

**Extension mechanism:**
- `column.cardSection: 'primary' | 'meta'` — optional; when any column has it, grouping uses explicit values; otherwise heuristic (first 2 primary, rest meta)
- `column.cardClassName` — optional; appended to the cell wrapper for page-level overrides

**Behavior:**
- Mobile: single column; all fields stacked (unchanged)
- Tablet: when meta columns exist, 2-col grid; primary left, meta right-aligned
- Desktop: table markup untouched
