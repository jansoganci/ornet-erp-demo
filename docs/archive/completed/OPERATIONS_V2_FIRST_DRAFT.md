# Operations V2 First Draft

> Status: Draft  
> Route: `/operations`  
> Scope: Operations pool + daily planning + work order / proposal branching  
> Access: `admin` and `accountant` only

---

## 1. Goal

Build a simple, Excel-friendly operations system that matches how the client already works.

The system must stay easy to understand:

- one intake pool for all incoming work
- one daily planning layer for what will be handled today / tomorrow
- work orders only for real field execution
- proposals only when the incoming item becomes a quotation flow
- every record must end with a clear outcome

This is not a complex workflow engine.
This is a practical operations control center.

---

## 2. Product Principles

- Keep the mental model close to Excel
- Do not force too much data at intake
- Do not create work orders for everything
- Do not create proposals for everything
- Allow office-handled work to be completed without field workflow
- Make all important actions visible on one main page
- Optimize for adoption, not theoretical perfection

---

## 3. Core Business Understanding

The client currently works with two Excel layers:

### 3.1 Open Work Pool

This is the real system entry point.

- Column A: Istanbul Europe open items
- Column D: Istanbul Anatolia open items
- Column F: Outside Istanbul open items

Every incoming item first lands here.

Examples:

- service issue
- installation request
- survey request
- proposal request
- cancellation / dismantling request
- remote support request

Important:
Not every item becomes a work order.

Possible outcomes:

- becomes a work order
- becomes a proposal
- solved in the office / remotely
- closed without action

### 3.2 Daily Planning

This is the simple operational board for planned work.

It contains mixed operational items:

- field jobs
- proposal follow-ups
- remote support items
- finance reminders
- internal reminders
- administrative tasks

This is not only a field schedule.
It is a daily execution list.

---

## 4. Final Concept

The final system should have 3 layers:

### 4.1 Operations Pool

Purpose:
Capture every incoming customer-facing operational item.

### 4.2 Daily Plan

Purpose:
Track what should be handled on a specific day, whether field or office.

### 4.3 Work Orders / Proposals

Purpose:
Structured downstream records created only when needed.

- `work_orders` for field execution
- `proposals` for quotation flow

---

## 5. Main Screen Structure

The main `/operations` page should stay on a single page, but use tabbed layout for clarity.

### 5.1 Recommended Layout

- Tab 1: `Pool + Daily Plan`
- Tab 2: `Calendar`
- Tab 3: `Insights`

### 5.2 Tab 1 Layout

Inside Tab 1, use a two-panel layout:

- Left panel: Operations Pool
- Right panel: Daily Plan

Why:

- same page, faster workflow
- pool item can quickly be added to plan
- user sees incoming items and today's workload together
- still simpler than sending the user across separate pages

On mobile or narrow screens, panels can stack vertically.

---

## 6. Data Model Direction

### 6.1 Rename `service_requests` now, while the table is still empty

We should rename the current table now, before real production data accumulates.

Reason:

- the current name is too narrow for the actual business concept
- later rename will be more painful once the table has real records and more dependencies
- the product meaning is broader than "service request"

Committed decision:

The new table name is **`operations_items`**. This is now final.

Frontend rename scope (all must change together in one pass):

| Current name | New name |
|---|---|
| `service_requests` (DB table) | `operations_items` |
| `serviceRequestKeys` (query key object) | `operationsItemKeys` |
| `fetchServiceRequests` | `fetchOperationsItems` |
| `fetchServiceRequest` | `fetchOperationsItem` |
| `createServiceRequest` | `createOperationsItem` |
| `updateServiceRequest` | `updateOperationsItem` |
| `deleteServiceRequest` | `deleteOperationsItem` |
| `cancelServiceRequest` | `cancelOperationsItem` |
| `updateContactStatus` | stays (concept unchanged) |
| `convertRequestToWorkOrder` | `convertItemToWorkOrder` |
| `boomerangRequest` | stays (concept unchanged) |
| `useServiceRequests` | `useOperationsItems` |
| `useServiceRequest` | `useOperationsItem` |
| `useCreateServiceRequest` | `useCreateOperationsItem` |
| `useUpdateServiceRequest` | `useUpdateOperationsItem` |
| `useDeleteServiceRequest` | `useDeleteOperationsItem` |
| `useCancelServiceRequest` | `useCancelOperationsItem` |
| `useConvertToWorkOrder` | stays (concept unchanged) |
| `REQUEST_STATUSES` (schema.js) | `ITEM_STATUSES` |
| `fn_convert_request_to_work_order` (RPC) | `fn_convert_item_to_work_order` |
| `fn_boomerang_failed_request` (RPC) | `fn_boomerang_failed_item` |
| `fn_get_operations_stats` (RPC) | stays (already generic) |
| `service_requests_detail` (DB view) | `operations_items_detail` |

Pre-migration required check:

Before running the rename migration, verify the table is actually empty:

```sql
SELECT COUNT(*) FROM service_requests;
```

If the count is 0, proceed with a clean `DROP + CREATE` migration.
If the count is > 0, a `RENAME + data migration` is required instead.

### 6.2 Make `customer_id` nullable

Decision for now:

- `customer_id` can be `NULL`

Reason:

- Excel import data is free-form
- some entries may be imported before customer matching
- this reduces intake friction

This can be revisited later based on usage.

### 6.3 Add `outcome_type`

Add a new close outcome field to `operations_items`.

Suggested values:

- `work_order`
- `proposal`
- `remote_resolved`
- `closed_no_action`
- `cancelled`

Purpose:

- not every closed item means the same thing
- reporting becomes meaningful
- we stop overloading one generic cancel state

### 6.4 Status strategy

Recommended status set:

- `open`
- `scheduled`
- `completed`
- `failed`
- `closed`

Meaning:

- `open`: still in pool / still being worked
- `scheduled`: linked to a work order and planned
- `completed`: field workflow completed successfully
- `failed`: field workflow failed and may boomerang
- `closed`: closed without active field workflow

Rule:

- `closed` must be paired with `outcome_type`

### 6.5 Add `plan_items` table

Create a lightweight table for daily planning.

Confirmed fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID PK | yes | |
| `plan_date` | DATE | yes | Which day this item belongs to |
| `description` | TEXT | yes | Free-form description (like Excel cell) |
| `notes` | TEXT | no | Column E equivalent — charge it, follow up, etc. |
| `item_type` | TEXT enum | yes | See values below |
| `status` | TEXT enum | yes | See values below, default `pending` |
| `is_carried` | BOOLEAN | no | `true` if this row was carried forward from a previous day |
| `source_plan_item_id` | UUID FK → plan_items | no | Points to the original row this was carried from |
| `operations_item_id` | UUID FK → operations_items | no | Link to pool item, if this plan item originated from one |
| `work_order_id` | UUID FK → work_orders | no | Link to work order, if applicable |
| `proposal_id` | UUID FK → proposals | no | Link to proposal, if applicable |
| `created_by` | UUID FK → profiles | yes | |
| `created_at` | TIMESTAMPTZ | yes | |
| `updated_at` | TIMESTAMPTZ | yes | Auto-updated via trigger |

Confirmed `item_type` values (5 total — no more):

| Value | Meaning |
|---|---|
| `field_work` | Requires a technician on-site |
| `office` | Any office, remote, or phone action — includes follow-ups |
| `proposal` | Proposal-related work |
| `finance` | Billing, charging, invoicing, payment reminders |
| `other` | Anything that does not fit the above |

`follow_up` is removed. It merges into `office` — they are the same mental category for operators.

Confirmed `status` values (3 total — no more):

| Value | Meaning | Excel equivalent |
|---|---|---|
| `pending` | Open, not yet attempted | White row |
| `done` | Completed successfully | Green row |
| `not_done` | Attempted but not completed — triggers carry forward | Red row |

`deferred` is removed. Deferring is an action (carry forward), not a status. When a user clicks carry forward on a `not_done` item:
- a new `plan_items` row is created with the new date
- the new row has `is_carried = true` and `source_plan_item_id` pointing to the original
- the original row stays as `not_done` — it is the historical record

This matches exactly how the Excel works: the row stays red, and the user writes it again the next day.

This is intentionally simple.

### 6.6 "Add to Daily Plan" Flow — Defined

When an operator clicks "Add to Daily Plan" on a pool item, the following happens:

1. A lightweight mini modal opens (no page navigation)
2. Modal contains:
   - Date picker — required, defaults to today
   - Notes field — optional (one line, maps to `plan_items.notes`)
   - Item type dropdown — optional, defaults to `office`
3. On confirm:
   - A `plan_items` row is created with `operations_item_id` pointing to the pool item
   - `description` is copied from the pool item's description
   - Modal closes, pool card stays visible — no status change on the pool item itself
4. The new plan item appears in the Daily Plan panel for the selected date

Rules:

- The same pool item can be added to multiple plan days (e.g. recurring follow-up)
- Adding to Daily Plan does not change the pool item's status
- The plan item and the pool item are linked but independent records
- The pool item is only closed when an outcome is chosen (work order, proposal, remote, etc.)

---

## 7. How The System Will Work

### 7.1 Intake Flow

1. Admin or accountant creates an item in the pool
2. Only minimum information is required
3. Item stays in the pool until decision is made
4. User decides what kind of result path it needs

### 7.2 Possible Outcome Paths

#### Path A: Work Order

Use when:

- service visit needed
- installation needed
- survey needed
- dismantling requires field visit

Flow:

1. Pool item is reviewed
2. If needed, add to Daily Plan
3. User clicks `Create Work Order`
4. System creates work order automatically
5. Pool item is linked to work order
6. Pool item moves to `scheduled`

#### Path B: Proposal

Use when:

- customer needs a quote
- new system request is not yet execution-ready

Flow:

1. Pool item is reviewed
2. User clicks `Create Proposal`
3. System creates proposal automatically
4. Pool item is linked to proposal
5. Pool item becomes `closed`
6. `outcome_type = proposal`

#### Path C: Remote / Office Resolution

Use when:

- solved by phone
- solved remotely
- solved at center without field work

Flow:

1. User resolves item
2. User clicks quick-close action
3. Pool item becomes `closed`
4. `outcome_type = remote_resolved`

#### Path D: Closed Without Further Action

Use when:

- customer no longer wants it
- duplicate / irrelevant item
- abandoned

Flow:

1. User closes item
2. Pool item becomes `closed`
3. `outcome_type = cancelled` or `closed_no_action`

---

## 8. Automatic Record Creation

### 8.1 Automatic Work Order Creation

Yes, this should exist.

Recommended behavior:

- If the pool item is a field job, user can click `Create Work Order`
- If a date is already chosen in Daily Plan, use it as the initial schedule
- If there is no date yet, ask for schedule in a lightweight modal
- The existing RPC pattern should still be used for WO creation

Important:

- never create work order silently without user action
- creation should be quick, but still explicit

### 8.2 Proposal Creation

Yes, this should also exist.

Recommended behavior:

- Add `Create Proposal` action on the pool item
- This action should navigate into the current proposal creation flow
- Pre-fill proposal form with known data if available:
  - customer
  - site
  - description
- Customer should be preselected when available
- Proposal creation should not be a silent one-click record creation

After creation:

- save `proposal_id` on the pool item
- mark item as `closed`
- set `outcome_type = proposal`

This is not a fully automatic flow.
It is a guided shortcut into the existing proposal module.

---

## 9. Daily Plan Behavior

The Daily Plan must stay very simple.

### 9.1 What it stores

- what should be done that day
- what was done
- what was not done
- what should be carried forward

### 9.2 What it can contain

- linked pool items
- linked work orders
- linked proposals
- independent reminders

### 9.3 Carry Forward

Carry forward is required.

Simple behavior:

- if item is still unfinished, user clicks `Carry Forward`
- system duplicates or moves it to next selected day
- no complex recurrence engine in first version

This matches the current Excel behavior without making the system heavy.

---

## 10. Calendar Direction

The calendar must not stay work-order-only.

It should show multiple event types with different colors:

- work orders
- proposals / proposal reminders
- daily plan items
- other reminders / follow-ups

Confirmed color direction — mapped to the existing design system in `src/features/calendar/utils.js`:

The calendar already uses semantic Tailwind classes, not raw hex values. The `getEventClassName(event)` function reads `event.resource._type` to distinguish event categories. This pattern is extended for `plan_items`.

| Event type | `_type` value | Color class | Visual |
|---|---|---|---|
| Work order (by status) | `work_order` | Existing `calendarEventClassByStatus` | pending=amber, scheduled/in_progress=blue, completed=green, cancelled=gray |
| Plan item — `pending` | `operations_plan` | `!bg-cyan-50 !border-l-4 !border-cyan-500 !text-cyan-800 dark:!bg-cyan-900/30 dark:!text-cyan-200` | Cyan — distinct from all WO statuses |
| Plan item — `done` | `operations_plan` | `!bg-success-50 !border-l-4 !border-success-500 !text-success-800 dark:!bg-success-900/30 dark:!text-success-200` | Green — matches completed concept |
| Plan item — `not_done` | `operations_plan` | `!bg-rose-50 !border-l-4 !border-rose-500 !text-rose-800 dark:!bg-rose-900/30 dark:!text-rose-200` | Rose/red — visually urgent, matches "red row" in Excel |
| Tasks (existing tasks module) | `plan` | Existing `PLAN_EVENT_CLASS` — violet | Unchanged |

Why cyan for `pending` plan items: the existing system uses amber (warning), blue (info/primary), green (success), gray (neutral), and violet (tasks). Cyan is the only clean gap — it is used for `bakim` in `CHART_COLORS` but is not used in any calendar event class, so there is no collision.

When the `plan_items` calendar events are built, `mapPlanItemToEvent()` should set `resource._type = 'operations_plan'` and pass `status` so `getEventClassName` can select the correct class.

Calendar purpose:

- give operational memory
- show what is planned
- show what is waiting
- show non-field reminders too

---

## 11. Permissions

Confirmed decision:

- only `admin` and `accountant` can see and manage these screens
- other roles should not see these screens at all

This applies to:

- Operations Pool
- Daily Plan
- Calendar for operations
- related create / close actions

No change needed toward wider access.

---

## 12. Import Strategy

### 12.1 Open Work Pool Import

Import should be flexible first.

V1 import logic:

- Column A -> `istanbul_europe`
- Column D -> `istanbul_anatolia`
- Column F -> `outside_istanbul`

Each non-empty cell becomes one pool item.

Minimum imported fields:

- `description`
- `region`

Optional imported fields if later available:

- `customer_id`
- `site_id`
- `contact_notes`
- `priority`
- `scheduled_date`

### 12.2 Daily Plan Import

If needed later, daily import can support:

- date
- description
- notes
- result/status

But this is not Phase 1 priority.

---

## 13. UI Summary

### 13.1 Pool Item Actions

Each pool item should support actions like:

- update contact status
- add to daily plan
- create work order
- create proposal
- mark resolved remotely
- close with outcome
- delete / soft delete

### 13.2 Daily Plan Item Actions

Each daily item should support:

- mark done
- mark not done
- defer
- carry forward
- open related pool item
- open related work order
- open related proposal

### 13.3 Keep Fast Entry

Intake should stay lightweight.

Ideal minimum manual fields:

- customer optional for import and optional for manual entry
- site optional for import and optional for manual entry
- description
- region

Everything else should be optional or deferred.

Important downstream rules:

- work order creation requires both customer and site
- proposal creation requires customer

---

## 14. Phased Delivery

### Phase 1

- add `outcome_type` to `service_requests`
- make `customer_id` nullable
- create `plan_items`
- redesign `/operations` main page as:
  - Tab 1: Pool + Daily Plan
  - Tab 2: Calendar
  - Tab 3: Insights
- add pool actions for:
  - create work order
  - create proposal
  - resolved remotely
  - close with outcome
- make calendar multi-type

### Phase 2

- add open work pool Excel import
- add daily plan carry-forward support in UI
- add proposal linking improvements
- improve review/filtering for imported items

### Later

- advanced fuzzy customer matching
- recurring reminders
- richer stats by outcome type
- more advanced operational shortcuts

---

## 15. Net System Summary

At the end of this redesign, the system should behave like this:

- every incoming customer-facing item first enters the pool
- the pool is the real start of operations
- some items are planned into the daily board
- some items become work orders
- some items become proposals
- some items are solved remotely or closed in-office
- every item ends with a clear outcome
- calendar shows the real operational picture, not only field jobs

In one sentence:

This becomes a simple operations command center, not just a service request queue.

---

## 16. Confirmed Product Decisions

These decisions are now confirmed for this draft:

### 16.1 Should `contact_status` stay for proposal and office-only items?

Decision:
Yes, keep it for now.

Reason:

- many items still start with customer communication
- it is already built
- it adds value for call handling

Rule:

- not every item will use it deeply
- it should remain available but not act as the main backbone of every record

### 16.2 Should a pool item be allowed without customer and site in manual entry too?

Decision:
Yes.

Reason:

- if import supports `NULL customer_id`, manual flow should not be stricter than import
- otherwise users will still prefer Excel for fast raw capture

Rule:

- customer and site are optional at intake
- work order creation requires customer and site
- proposal creation requires customer

### 16.3 Should proposal creation be one-click or form-first?

Decision:
Form-first, but prefilled.

Reason:

- proposals usually need more structure
- pure one-click may create low-quality records
- this should push the user into the current proposal creation process with customer prefill when possible

### 16.4 Should work order creation require daily plan first?

Decision:
No.

Reason:

- sometimes user may want to create WO directly
- daily plan should help operations, not block it

Rule:

- WO can be created directly from pool
- if planned date exists, reuse it
- if not, ask for a schedule

### 16.5 Should `cancelled` remain as one `outcome_type`?

Decision:
Yes, but separate from `closed_no_action`.

Reason:

- `cancelled` means an explicit cancellation
- `closed_no_action` means the item ended without further operational work

This makes reporting cleaner.

### 16.6 Should we physically rename `service_requests` now?

Decision:
Yes, now is the right time.

Reason:

- the table is still empty enough to take the pain now
- later rename will be harder once data and dependencies grow
- the broader business meaning should be reflected early

### 16.7 Should Daily Plan include non-customer internal reminders?

Decision:
Yes, definitely.

Reason:

- the client's current daily sheet already does this
- forcing everything to be customer-linked would recreate Excel outside the ERP

---

## 17. Recommended Immediate Next Step

Before implementation starts, convert this draft into:

1. a final product decision document
2. a database change plan
3. a UI implementation phase plan

That way we build the right version once, without unnecessary detours.

---

## 18. Migration Pre-flight Checklist

This section documents all tasks that must be completed or verified before and during the implementation migration.

### 18.1 Before Running the Rename Migration

- [ ] Run `SELECT COUNT(*) FROM service_requests;`
  - If 0 → proceed with clean DROP + CREATE migration
  - If > 0 → use ALTER TABLE RENAME + column-level migration instead of DROP

### 18.2 Database Objects to Rename

All of the following must be renamed in the migration file:

| Current name | New name | Type |
|---|---|---|
| `service_requests` | `operations_items` | Table |
| `service_requests_detail` | `operations_items_detail` | View |
| `fn_convert_request_to_work_order` | `fn_convert_item_to_work_order` | RPC function |
| `fn_boomerang_failed_request` | `fn_boomerang_failed_item` | RPC function |
| `fn_get_operations_stats` | unchanged | RPC function |
| All index names prefixed `idx_sr_*` | rename to `idx_oi_*` | Indexes |
| RLS policy names referencing `service_requests` | update to `operations_items` | RLS policies |
| `update_service_requests_updated_at` | `update_operations_items_updated_at` | Trigger |

### 18.3 Frontend Objects to Rename

All of the following must be renamed in a single coordinated pass (do not rename partially — it will break the app):

| File | Current name | New name |
|---|---|---|
| `api.js` | `serviceRequestKeys` | `operationsItemKeys` |
| `api.js` | `fetchServiceRequests` | `fetchOperationsItems` |
| `api.js` | `fetchServiceRequest` | `fetchOperationsItem` |
| `api.js` | `createServiceRequest` | `createOperationsItem` |
| `api.js` | `updateServiceRequest` | `updateOperationsItem` |
| `api.js` | `deleteServiceRequest` | `deleteOperationsItem` |
| `api.js` | `cancelServiceRequest` | `cancelOperationsItem` |
| `api.js` | `convertRequestToWorkOrder` | `convertItemToWorkOrder` |
| `api.js` | `'service_requests'` (table ref) | `'operations_items'` |
| `hooks.js` | `useServiceRequests` | `useOperationsItems` |
| `hooks.js` | `useServiceRequest` | `useOperationsItem` |
| `hooks.js` | `useCreateServiceRequest` | `useCreateOperationsItem` |
| `hooks.js` | `useUpdateServiceRequest` | `useUpdateOperationsItem` |
| `hooks.js` | `useDeleteServiceRequest` | `useDeleteOperationsItem` |
| `hooks.js` | `useCancelServiceRequest` | `useCancelOperationsItem` |
| `hooks.js` | `useConvertToWorkOrder` | unchanged |
| `schema.js` | `REQUEST_STATUSES` | `ITEM_STATUSES` |
| `index.js` | all re-exports | update accordingly |

### 18.4 New Database Objects to Create

In the same migration or a sequential migration:

- [ ] Add `outcome_type` column to `operations_items`
  - enum: `work_order`, `proposal`, `remote_resolved`, `closed_no_action`, `cancelled`
  - nullable, only required when `status = 'closed'`
- [ ] Make `customer_id` nullable on `operations_items`
- [ ] Update status CHECK constraint: replace `'cancelled'` with `'closed'`
- [ ] Update `quickEntrySchema` in `schema.js`: make `customer_id` optional
- [ ] Create `plan_items` table with confirmed schema from Section 6.5
- [ ] Add `update_plan_items_updated_at` trigger on `plan_items`
- [ ] Add RLS policies on `plan_items` (same pattern as `operations_items`)
- [ ] Add indexes on `plan_items`: `plan_date`, `operations_item_id`, `created_by`

### 18.5 Calendar Integration Checklist

- [ ] Add `mapPlanItemToEvent()` to `src/features/calendar/utils.js`
  - sets `resource._type = 'operations_plan'`
  - passes `status` for color selection
- [ ] Add `OPERATIONS_PLAN_EVENT_CLASSES` map to `src/features/calendar/utils.js`
  - `pending` → cyan class
  - `done` → success green class
  - `not_done` → rose class
- [ ] Update `getEventClassName()` to handle `_type === 'operations_plan'`
- [ ] Update `CalendarTab.jsx` in operations to fetch and merge `plan_items` events alongside work order events
