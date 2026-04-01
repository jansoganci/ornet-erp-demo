# Operations V2 — Build Plan

> Status: Ready to execute  
> Source spec: `OPERATIONS_V2_FIRST_DRAFT.md`  
> Route: `/operations`  
> Last updated: 2026-04-01

---

## How to Use This Document

Each phase is independently deployable and testable.
Complete each phase fully before starting the next.
Never skip ahead — later phases depend on earlier ones being stable.

Each phase lists:
- **Goal** — what this phase delivers
- **Prerequisites** — what must be done first
- **Tasks** — ordered list of concrete build steps
- **Done when** — how to know the phase is complete
- **Size** — S (small, < 1 session) / M (medium, 1–2 sessions) / L (large, 2+ sessions)

---

## Phase Map

```
Phase 0: Rename Foundation         (DB + frontend rename pass)
    ↓
Phase 1: Extend Operations Model   (outcome_type, nullable customer, status update)
    ↓
Phase 2: New Pool Close Actions    (UI for remote resolve / close with outcome / proposal shortcut)
    ↓ (independent)
Phase 3: plan_items DB + API       (table, api.js, hooks.js, schema additions)
    ↓
Phase 4: Daily Plan Panel UI       (PlanPanel component, Add to Plan modal, carry forward)
    ↓ (both Phase 2 and Phase 4 required)
Phase 5: Tab 1 Two-Panel Layout    (restructure Tab 1: Pool left + Plan right)
    ↓
Phase 6: Calendar Multi-type       (plan_items events in CalendarTab)
    ↓
Phase 7: Insights Outcome Stats    (outcome_type breakdown in stats RPC + InsightsTab)
    — — — — — — — — — —
Phase 8: Excel Import (later)      (open work pool import)
```

Phases 2 and 3 can be built in parallel if two people are working.
All other phases are sequential.

---

## Phase 0: Rename Foundation

> **Goal:** Rename `service_requests` to `operations_items` across DB and frontend without changing any behavior.

**Size:** M

**Prerequisites:** None — this is the starting point.

**Critical rule:** This phase must not change any business logic. Pure rename only. The app must work identically after this phase.

### Tasks

#### 0.1 — Verify the table is empty

Before writing the migration, run in Supabase SQL editor:

```sql
SELECT COUNT(*) FROM service_requests;
```

- If 0 → proceed with clean DROP + CREATE migration (simpler)
- If > 0 → use ALTER TABLE RENAME approach (must preserve data)

#### 0.2 — Write DB migration

Create: `supabase/migrations/XXXXXX_rename_service_requests.sql`

Rename the following (use DROP+CREATE or ALTER TABLE RENAME depending on 0.1 result):

| Object | Old name | New name |
|---|---|---|
| Table | `service_requests` | `operations_items` |
| View | `service_requests_detail` | `operations_items_detail` |
| RPC | `fn_convert_request_to_work_order` | `fn_convert_item_to_work_order` |
| RPC | `fn_boomerang_failed_request` | `fn_boomerang_failed_item` |
| RPC | `fn_get_operations_stats` | unchanged |
| Trigger | `update_service_requests_updated_at` | `update_operations_items_updated_at` |
| All indexes | `idx_sr_*` | `idx_oi_*` |
| RLS policies | reference `service_requests` | update to `operations_items` |

Note: `fn_get_operations_stats` stays — it is already named generically.

#### 0.3 — Apply migration and verify in Supabase

Run the migration. Confirm in Supabase table editor that `operations_items` exists and `service_requests` is gone.

#### 0.4 — Frontend rename pass (all in one commit)

Do all of the following in a single coordinated pass. Do not do partial renames — the app will break mid-way.

**`src/features/operations/api.js`**

| Change | Old | New |
|---|---|---|
| Query key object | `serviceRequestKeys` | `operationsItemKeys` |
| Table reference (all `.from()` calls) | `'service_requests'` | `'operations_items'` |
| Function | `fetchServiceRequests` | `fetchOperationsItems` |
| Function | `fetchServiceRequest` | `fetchOperationsItem` |
| Function | `createServiceRequest` | `createOperationsItem` |
| Function | `updateServiceRequest` | `updateOperationsItem` |
| Function | `deleteServiceRequest` | `deleteOperationsItem` |
| Function | `cancelServiceRequest` | `cancelOperationsItem` |
| Function | `convertRequestToWorkOrder` | `convertItemToWorkOrder` |
| RPC call | `'fn_convert_request_to_work_order'` | `'fn_convert_item_to_work_order'` |
| RPC call | `'fn_boomerang_failed_request'` | `'fn_boomerang_failed_item'` |

**`src/features/operations/hooks.js`**

| Change | Old | New |
|---|---|---|
| All imports from api.js | update to new names | |
| Hook | `useServiceRequests` | `useOperationsItems` |
| Hook | `useServiceRequest` | `useOperationsItem` |
| Hook | `useCreateServiceRequest` | `useCreateOperationsItem` |
| Hook | `useUpdateServiceRequest` | `useUpdateOperationsItem` |
| Hook | `useDeleteServiceRequest` | `useDeleteOperationsItem` |
| Hook | `useCancelServiceRequest` | `useCancelOperationsItem` |
| All `serviceRequestKeys` references | | `operationsItemKeys` |

**`src/features/operations/schema.js`**

| Change | Old | New |
|---|---|---|
| Constant | `REQUEST_STATUSES` | `ITEM_STATUSES` |

**`src/features/operations/index.js`**

Update all re-exports to match new names.

**All components that import from `operations/hooks.js` or `operations/api.js`**

Search for any usage of the old names in:
- `components/RequestPoolTab.jsx`
- `components/RequestCard.jsx`
- `components/QuickEntryRow.jsx`
- `components/CallQueueModal.jsx`
- `components/InlineScheduler.jsx`
- `components/ContactStatusBadge.jsx`
- `OperationsBoardPage.jsx`

Update all imports and references.

#### 0.5 — Run app, verify nothing is broken

- Open `/operations` — pool should load
- Create a test entry — should work
- Update contact status — should work
- Delete test entry — should work
- Calendar tab — should load
- Insights tab — should load

**Done when:**
- App runs without errors
- `/operations` works identically to before
- No reference to `service_requests` remains in `src/features/operations/`
- Migration applied in Supabase

---

## Phase 1: Extend Operations Items Model

> **Goal:** Add `outcome_type`, make `customer_id` optional, replace `cancelled` status with `closed` in the DB and backend layer. No UI changes in this phase.

**Size:** S

**Prerequisites:** Phase 0 complete.

### Tasks

#### 1.1 — Write DB migration

Create: `supabase/migrations/XXXXXX_operations_items_v2_model.sql`

Changes:

```sql
-- 1. Add outcome_type column
ALTER TABLE operations_items
  ADD COLUMN outcome_type TEXT
  CHECK (outcome_type IN ('work_order', 'proposal', 'remote_resolved', 'closed_no_action', 'cancelled'));

-- 2. Make customer_id nullable
ALTER TABLE operations_items
  ALTER COLUMN customer_id DROP NOT NULL;

-- 3. Add 'closed' to status CHECK constraint
-- (drop old constraint, add new one that includes 'closed' and removes 'cancelled')
ALTER TABLE operations_items
  DROP CONSTRAINT IF EXISTS service_requests_status_check,
  ADD CONSTRAINT operations_items_status_check
    CHECK (status IN ('open', 'scheduled', 'completed', 'failed', 'closed'));
```

Note: Any existing rows with `status = 'cancelled'` must be migrated to `status = 'closed', outcome_type = 'cancelled'` before dropping the old status value.

#### 1.2 — Update `schema.js`

In `src/features/operations/schema.js`:

- Update `ITEM_STATUSES` array: replace `'cancelled'` with `'closed'`
- Add `OUTCOME_TYPES` constant:
  ```js
  export const OUTCOME_TYPES = ['work_order', 'proposal', 'remote_resolved', 'closed_no_action', 'cancelled'];
  ```
- Update `quickEntrySchema`: make `customer_id` optional
  ```js
  customer_id: z.string().uuid().optional().or(z.literal('')),
  ```
- Update `quickEntryDefaultValues`: `customer_id: ''`

#### 1.3 — Update `api.js`

In `src/features/operations/api.js`:

- Update `cancelOperationsItem` (the old cancel function):
  - Change: sets `status = 'closed'` + `outcome_type = 'cancelled'`
  - Remove: setting `contact_status = 'cancelled'` (contact_status is independent)

#### 1.4 — Update `QuickEntryRow.jsx`

Remove the `required` constraint from the customer combobox. The field should still show but be optional.

Downstream validation rule: if user tries to create a work order from a pool item with no customer, show an inline error at that step — not at intake.

#### 1.5 — Apply migration, verify

- Run migration
- Confirm `outcome_type` column exists in Supabase
- Confirm `customer_id` accepts NULL
- Confirm `status = 'closed'` is accepted
- Quick-enter a pool item without a customer — should work

**Done when:**
- Migration applied
- Quick entry works without customer
- Cancel action sets `status='closed'` + `outcome_type='cancelled'`
- No TypeErrors in console

---

## Phase 2: New Pool Card Close Actions

> **Goal:** Add three new outcome actions to pool cards — "Resolved Remotely", "Create Proposal" shortcut, and "Close with Outcome" modal. Update the existing Cancel to use the new close flow.

**Size:** M

**Prerequisites:** Phase 1 complete.

### Tasks

#### 2.1 — Add `closeOperationsItem` to `api.js`

New function that sets `status = 'closed'` and `outcome_type` in one call:

```js
export async function closeOperationsItem(id, outcomeType) {
  // UPDATE operations_items SET status='closed', outcome_type=outcomeType WHERE id=id
}
```

#### 2.2 — Add `useCloseOperationsItem` hook to `hooks.js`

Standard mutation hook wrapping `closeOperationsItem`.
On success: invalidate `operationsItemKeys.lists()` and `operationsItemKeys.stats()`.

#### 2.3 — Build `CloseOutcomeModal` component

New file: `src/features/operations/components/CloseOutcomeModal.jsx`

Modal fields:
- Outcome type radio/select — required
  - "Resolved Remotely" (`remote_resolved`)
  - "No Action Needed" (`closed_no_action`)
  - "Cancelled by Customer" (`cancelled`)
- Notes field — optional (saves to `contact_notes`)
- Confirm button

This modal is for the "close with reason" path. Do not use it for work order or proposal paths (those have their own flows).

#### 2.4 — Add "Resolved Remotely" quick-close to `RequestCard.jsx`

Add a single button to the card action area (visible when `contact_status = 'confirmed'` or always visible in the card menu):

- Label: "Resolved Remotely" (or icon button with tooltip)
- On click: calls `useCloseOperationsItem` directly with `outcome_type = 'remote_resolved'`
- No modal needed — one click, done
- On success: card disappears from the pool (status is now `closed`)

#### 2.5 — Add "Create Proposal" action to `RequestCard.jsx`

Add a "Create Proposal" button/menu item to the card:

- On click: navigate to `/proposals/new` with query params:
  - `customerId` = pool item's `customer_id` (if present)
  - `siteId` = pool item's `site_id` (if present)
  - `description` = pool item's `description` (as note)
  - `sourceItemId` = pool item's `id`
- The existing `ProposalFormPage.jsx` must read these params and pre-fill the form
- After proposal is saved, set `outcome_type = 'proposal'` + `status = 'closed'` on the pool item
  - Either via a callback URL param or manually by the user closing the pool item after proposal creation
  - Simplest v1: user manually closes the pool item after navigating back

Note: Do not block proposal creation on whether the pool item has a customer. Validate inside the proposal form (which already requires customer).

#### 2.6 — Add "Close with Outcome" to card menu

Replace the existing "Cancel" menu item in `RequestCard.jsx` with "Close with Outcome".
On click: open `CloseOutcomeModal`.

Remove the old direct-cancel path. All closes now go through `CloseOutcomeModal` or the quick-close buttons.

#### 2.7 — Update translations

In `src/locales/tr/operations.json`, add keys for:
- New button labels
- Modal title, radio labels, confirm/cancel buttons
- Toast messages for each outcome type

**Done when:**
- "Resolved Remotely" closes a card in one click
- "Create Proposal" navigates to proposal form with pre-filled data
- "Close with Outcome" modal works with all 3 outcome options
- Old direct-cancel path is gone
- Closed items disappear from the pool (they have `status = 'closed'`, the pool filter shows `status = 'open'` only)

---

## Phase 3: `plan_items` DB + API Layer

> **Goal:** Create the `plan_items` table and the full data access layer. No UI yet — just the DB and API.

**Size:** S

**Prerequisites:** Phase 0 complete. (Independent of Phase 2.)

### Tasks

#### 3.1 — Write DB migration

Create: `supabase/migrations/XXXXXX_plan_items.sql`

Table definition:

```sql
CREATE TABLE plan_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date            DATE NOT NULL,
  description          TEXT NOT NULL,
  notes                TEXT,
  item_type            TEXT NOT NULL DEFAULT 'office'
                         CHECK (item_type IN ('field_work', 'office', 'proposal', 'finance', 'other')),
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'done', 'not_done')),
  is_carried           BOOLEAN NOT NULL DEFAULT false,
  source_plan_item_id  UUID REFERENCES plan_items(id) ON DELETE SET NULL,
  operations_item_id   UUID REFERENCES operations_items(id) ON DELETE SET NULL,
  work_order_id        UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  proposal_id          UUID REFERENCES proposals(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pi_plan_date ON plan_items(plan_date);
CREATE INDEX idx_pi_operations_item ON plan_items(operations_item_id);
CREATE INDEX idx_pi_created_by ON plan_items(created_by);
CREATE INDEX idx_pi_status ON plan_items(status);

-- Auto-update trigger
CREATE TRIGGER update_plan_items_updated_at
  BEFORE UPDATE ON plan_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_items_select" ON plan_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "plan_items_insert" ON plan_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'accountant')
  ));

CREATE POLICY "plan_items_update" ON plan_items
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'accountant')
  ));

CREATE POLICY "plan_items_delete" ON plan_items
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'accountant')
  ));
```

#### 3.2 — Create `src/features/operations/planItemsApi.js`

Separate file (not mixed into main `api.js` — the operations module already has pattern precedent for split api files e.g. subscriptions).

Functions to implement:

| Function | What it does |
|---|---|
| `fetchPlanItems(date)` | Fetch all plan_items for a given date, ordered by created_at |
| `fetchPlanItemsRange(dateFrom, dateTo)` | Fetch plan_items in a date range (for calendar) |
| `createPlanItem(data)` | Insert a new plan_item |
| `updatePlanItemStatus(id, status)` | Set status to done / not_done |
| `carryForwardPlanItem(id, newDate)` | Create a new plan_item row from an existing one with is_carried=true, source_plan_item_id=id, plan_date=newDate |
| `deletePlanItem(id)` | Hard delete (no soft delete needed — plan items are ephemeral) |

Query key object: `planItemKeys` with `byDate(date)` and `range(from, to)` patterns.

#### 3.3 — Create `src/features/operations/planItemsHooks.js`

React Query hooks wrapping `planItemsApi.js`:

| Hook | Wraps |
|---|---|
| `usePlanItems(date)` | `fetchPlanItems` — staleTime: 30_000 |
| `usePlanItemsRange(dateFrom, dateTo)` | `fetchPlanItemsRange` |
| `useCreatePlanItem()` | mutation, invalidates `byDate` |
| `useUpdatePlanItemStatus()` | mutation, invalidates `byDate` |
| `useCarryForwardPlanItem()` | mutation, invalidates both dates |
| `useDeletePlanItem()` | mutation, invalidates `byDate` |

#### 3.4 — Add schema additions to `schema.js`

Add to `src/features/operations/schema.js`:

```js
export const PLAN_ITEM_TYPES = ['field_work', 'office', 'proposal', 'finance', 'other'];
export const PLAN_ITEM_STATUSES = ['pending', 'done', 'not_done'];
```

Add `createPlanItemSchema` and `addToPlanModalSchema` (date + notes + item_type).

#### 3.5 — Update `index.js` exports

Export new api functions, hooks, and constants.

**Done when:**
- Migration applied, `plan_items` table exists in Supabase
- `createPlanItem` creates rows successfully (test in Supabase or via temporary console call)
- `carryForwardPlanItem` creates a new row with correct `is_carried = true` and `source_plan_item_id`

---

## Phase 4: Daily Plan Panel UI

> **Goal:** Build the PlanPanel component and the "Add to Daily Plan" mini modal on pool cards.

**Size:** L

**Prerequisites:** Phase 3 complete.

### Tasks

#### 4.1 — Build `AddToPlanModal` component

New file: `src/features/operations/components/AddToPlanModal.jsx`

Modal triggered from a pool card's "Add to Daily Plan" action.

Fields:
- Date picker — required, default today
- Notes — optional, one line
- Item type — optional dropdown, default `office`

On confirm:
- Calls `useCreatePlanItem` with `operations_item_id` linked, description copied from pool item
- Modal closes
- No change to pool item status

#### 4.2 — Add "Add to Daily Plan" button to `RequestCard.jsx`

Add to the card's action menu or as a direct button (if space allows).
On click: open `AddToPlanModal` with the pool item's data pre-set.

#### 4.3 — Build `PlanItemRow` component

New file: `src/features/operations/components/PlanItemRow.jsx`

Single plan item row. Displays:

- Checkbox (done toggle — click cycles: pending → done → not_done → pending)
- Description text (strike-through when `done`)
- `item_type` badge (small)
- Notes text if present (secondary color, small)
- Link badge if `operations_item_id`, `work_order_id`, or `proposal_id` is set
- Action menu: Carry Forward, Delete

Visual states:
- `pending` → normal text, white/default background
- `done` → strikethrough text, subtle green left border
- `not_done` → normal text, subtle rose left border (matches Excel red)

#### 4.4 — Build `CarryForwardModal` component

Simple mini modal:
- Date picker — required, default tomorrow
- Confirm button

On confirm: calls `useCarryForwardPlanItem(id, newDate)`.
Original row stays as `not_done`. New row appears on the target date.

#### 4.5 — Build `PlanPanel` component

New file: `src/features/operations/components/PlanPanel.jsx`

Structure:
```
[← Today →] [Date label] (date navigation, arrow buttons)
─────────────────────────────────────
[PlanItemRow]
[PlanItemRow]
[PlanItemRow]
─────────────────────────────────────
[+ Add item] (inline quick-add row)
```

Behaviors:
- Date navigation: prev/next day arrows, Today shortcut
- Fetches `usePlanItems(selectedDate)` — updates automatically when date changes
- Inline "Add item": text input + item_type dropdown + Add button (calls `useCreatePlanItem`)
- Empty state: "No items for this day." with an Add button
- Loading skeleton while fetching

**Done when:**
- "Add to Daily Plan" from a pool card creates a plan item and it appears in the panel
- Mark done/not done toggles correctly with visual state
- Carry Forward creates a new row on the selected date
- Inline add creates standalone plan items (no pool link)
- Date navigation works

---

## Phase 5: Tab 1 Two-Panel Layout

> **Goal:** Restructure the Tab 1 of `/operations` from a single full-width pool into a two-panel layout: pool on the left, daily plan on the right.

**Size:** M

**Prerequisites:** Phase 2 complete + Phase 4 complete.

### Tasks

#### 5.1 — Restructure `OperationsBoardPage.jsx` Tab 1

The current Tab 1 renders `<RequestPoolTab />` full width.

Change to:

```jsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
  <RequestPoolTab />
  <PlanPanel />
</div>
```

- Desktop (lg+): pool takes remaining width, plan panel is fixed 360px right column
- Tablet and mobile (`< lg`): panels stack vertically — pool on top, plan below
- The 360px right column width is a starting point — adjust based on visual testing

#### 5.2 — Adjust `RequestPoolTab.jsx` for narrower width

Currently the card grid is:
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

With the new layout, on desktop the pool panel is narrower. Update to:
```
grid-cols-1 md:grid-cols-2
```

Drop the 3-column variant — in the two-panel layout there is not enough space for 3 columns.

#### 5.3 — Update tab label

The current Tab 1 label is likely "Pool" or "Havuz".
Update to reflect the combined content. Options: "Operasyon" / "Havuz & Plan" — choose one in Turkish based on what the client calls this view.

#### 5.4 — Verify mobile layout

On mobile (< lg), the plan panel should appear below the pool.
The plan panel should not be cut off or overflow.
Test with a realistic number of items in both panels.

**Done when:**
- Desktop shows two panels side by side
- Mobile/tablet stacks vertically
- No overflow or z-index issues
- Pool card grid is readable at the narrower width

---

## Phase 6: Calendar Multi-type Events

> **Goal:** Add `plan_items` events to the CalendarTab so it shows the full operational picture, not only work orders.

**Size:** M

**Prerequisites:** Phase 3 complete.

### Tasks

#### 6.1 — Add `mapPlanItemToEvent` to `src/features/calendar/utils.js`

```js
export function mapPlanItemToEvent(planItem) {
  const start = parseScheduledAt(planItem.plan_date, '09:00');
  if (!start) return null;
  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
  return {
    id: `plan-item-${planItem.id}`,
    title: planItem.description,
    start,
    end,
    resource: { ...planItem, _type: 'operations_plan' },
  };
}
```

#### 6.2 — Add `OPERATIONS_PLAN_EVENT_CLASSES` to `src/features/calendar/utils.js`

```js
export const OPERATIONS_PLAN_EVENT_CLASSES = {
  pending:  '!bg-cyan-50 !border-l-4 !border-cyan-500 !text-cyan-800 dark:!bg-cyan-900/30 dark:!text-cyan-200',
  done:     '!bg-success-50 !border-l-4 !border-success-500 !text-success-800 dark:!bg-success-900/30 dark:!text-success-200',
  not_done: '!bg-rose-50 !border-l-4 !border-rose-500 !text-rose-800 dark:!bg-rose-900/30 dark:!text-rose-200',
};
```

#### 6.3 — Update `getEventClassName` in `src/features/calendar/utils.js`

```js
export function getEventClassName(event) {
  if (event?.resource?._type === 'plan') return PLAN_EVENT_CLASS; // existing tasks
  if (event?.resource?._type === 'operations_plan') {
    const status = event?.resource?.status ?? 'pending';
    return OPERATIONS_PLAN_EVENT_CLASSES[status] ?? OPERATIONS_PLAN_EVENT_CLASSES.pending;
  }
  const status = event?.resource?.status;
  return calendarEventClassByStatus[status] ?? '...'; // existing fallback
}
```

#### 6.4 — Update `CalendarTab.jsx` in operations to merge plan_items events

Current: fetches only `useCalendarWorkOrders`.

Add: also fetch `usePlanItemsRange(dateFrom, dateTo)` from Phase 3's hooks.

Merge both event arrays before passing to `<Calendar events={...} />`.

```js
const planEvents = (planItems ?? []).map(mapPlanItemToEvent).filter(Boolean);
const allEvents = [...workOrderEvents, ...planEvents];
```

#### 6.5 — Add calendar legend (optional but recommended)

Small color legend below the calendar toolbar showing what each color means.
Keep it compact — one row, colored dots + labels.

**Done when:**
- Plan items appear on the calendar on their `plan_date`
- Done items are green, not_done items are rose, pending items are cyan
- Work order events are unchanged
- Clicking a plan item does nothing (no detail page exists yet — that's fine)
- No event collisions or rendering issues

---

## Phase 7: Insights Outcome Stats

> **Goal:** Update the stats RPC and InsightsTab to show outcome_type breakdown so reporting becomes meaningful.

**Size:** S

**Prerequisites:** Phase 1 complete (outcome_type column exists).

### Tasks

#### 7.1 — Update `fn_get_operations_stats` RPC

In the migration or via Supabase SQL editor, add an `outcomes` block to the returned JSON:

```sql
'outcomes', json_build_object(
  'work_order',       COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'work_order'    AND ...date range...),
  'proposal',         COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'proposal'      AND ...date range...),
  'remote_resolved',  COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'remote_resolved' AND ...),
  'closed_no_action', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'closed_no_action' AND ...),
  'cancelled',        COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'cancelled'     AND ...)
)
```

Add this to the existing `period` JSON object alongside `scheduled`, `completed`, `failed`, etc.

#### 7.2 — Update `InsightsTab.jsx`

Add an "Outcomes" card to the Insights tab:

- Title: "Kapanış Sonuçları" (or similar)
- Show horizontal progress bars per outcome type (same pattern as the existing Regional Breakdown card)
- Values come from `stats.period.outcomes`
- Only show if at least one closed item exists in the period (otherwise hide the card)

**Done when:**
- Stats RPC returns outcome breakdown
- InsightsTab shows the outcomes card
- All 5 outcome types are displayed with counts

---

## Phase 8: Excel Import (Later)

> **Goal:** Allow importing the client's Open Work Pool Excel into the operations pool.

**Size:** L

**Prerequisites:** All previous phases complete and stable.

**Note:** Do not start this phase until the manual pool workflow is fully adopted and stable. The import is only useful once operators understand the system.

### Tasks (outline only — detail when phase starts)

- Build `src/features/operations/importApi.js`
- Build `OperationsImportPage.jsx` at `/operations/import`
- Column parser: read column A → `istanbul_europe`, column D → `istanbul_anatolia`, column F → `outside_istanbul`
- Each non-empty cell → one `operations_items` row with `description` + `region`
- All other fields: `customer_id = NULL`, `status = 'open'`, `work_type = 'other'`, `priority = 'normal'`
- Show import result summary (rows created, rows skipped)
- Add "Import" button to pool header (admin only)
- Add route to `App.jsx`

---

## Summary Table

| Phase | What it builds | Size | Blocks |
|---|---|---|---|
| 0 | Rename foundation (DB + frontend) | M | Everything |
| 1 | outcome_type, nullable customer, status fix | S | Phase 2, Phase 7 |
| 2 | New pool close actions (remote, proposal, outcome modal) | M | Phase 5 |
| 3 | plan_items DB + API layer | S | Phase 4, Phase 6 |
| 4 | Daily Plan Panel UI + Add to Plan modal | L | Phase 5 |
| 5 | Tab 1 two-panel layout | M | — |
| 6 | Calendar multi-type events | M | — |
| 7 | Insights outcome stats | S | — |
| 8 | Excel import | L | — |

**Total estimate (excluding Phase 8):** 7 phases, roughly 5–8 focused sessions depending on pace.
