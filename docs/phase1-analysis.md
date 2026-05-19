# Phase 1 Analysis

This note maps the hackathon document to the implementation in this repository.

## Source document

`ATOMQUEST HACKATHON 1.0 - Problem Statement`

Core problem:

- build a structured digital goal-setting and tracking portal
- support the full goal lifecycle
- be intuitive, reliable, and audit-ready

## Phase 1 requirements extracted from the brief

### 1. Goal creation

Employees must be able to:

- create a goal sheet
- choose a thrust area
- define goal title and description
- assign UoM as `Numeric`, `%`, `Timeline`, or `Zero-based`
- enter targets and weightage

Implementation:

- employee dashboard in the React client
- SQLite-backed goal sheet per employee
- UoM stored explicitly on every goal

### 2. Validation rules

The brief explicitly requires:

- total weightage across all goals must equal `100%`
- minimum weightage per goal is `10%`
- maximum goals per employee is `8`

Implementation:

- server-side validation in [server/src/validation.ts](/C:/Users/rnidh/Documents/Codex/2026-05-18/files-mentioned-by-the-user-6a06fcd06885a/server/src/validation.ts)
- employee and manager UI both surface validation state
- approval also re-checks the same rules before lock

### 3. Manager approval workflow

The brief requires managers to:

- review submitted goals
- edit targets and weightages inline
- approve or return for rework

Implementation:

- manager queue with submitted sheets
- inline save for `targetValue` and `weightage`
- return comment support
- approval transitions the sheet to `APPROVED_LOCKED`

### 4. Locking and admin intervention

The brief says approved goals are locked and cannot be edited without admin intervention.

Implementation:

- employee edits are blocked once a sheet is approved
- admin can unlock a sheet and move it to `NEEDS_REWORK`

### 5. Shared goals

The brief requires:

- admin or manager can push a departmental KPI to multiple employees
- recipients may change only weightage
- title and target stay read-only
- the model should support a primary owner for future achievement syncing

Implementation:

- shared-goal composer in manager and admin views
- shared goals are linked in the database with a `sourceSharedGoalId`
- recipient sheets receive a locked KPI card
- primary owner is stored for later Phase 2 expansion

### 6. Governance and audit readiness

The broader document also calls for audit logging and admin oversight.

Implementation:

- audit log table in SQLite
- admin overview for recent actions
- all key Phase 1 actions write structured audit entries

## Intentional assumptions

The document leaves a few workflow details open, so the implementation uses these explicit assumptions:

1. Employees can save drafts even when their sheet is not yet submittable.
2. Shared goals lock the full KPI definition for recipients, with weightage remaining editable.
3. If a shared goal is pushed to a submitted sheet, that sheet re-enters rework so the employee can rebalance to `100%`.

## What is intentionally not implemented yet

These belong to later sections of the brief:

- quarterly achievement capture
- status tracking as `Not Started / On Track / Completed`
- check-in comments
- progress scoring formulas
- exports, dashboards, and analytics beyond the Phase 1 audit/admin view

The current structure is ready for those additions without needing a rewrite.
