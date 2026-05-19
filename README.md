# AtomQuest Goal Portal

Phase 1 of the `AtomQuest Hackathon 1.0` problem statement is implemented here as a full-stack TypeScript web app with seeded demo users for the required employee, manager, and admin journeys.

## What is implemented

- Employee goal-sheet drafting and submission
- Required goal fields: thrust area, title, description, UoM, target, and weightage
- Hard validation rules from the brief:
  - total weightage must equal `100%`
  - minimum individual goal weightage is `10%`
  - maximum goals per employee is `8`
- Manager approval workflow with inline target and weightage editing
- Return-for-rework flow with comments
- Locking on approval
- Admin unlock flow
- Shared KPI assignment by manager or admin
- Audit trail for creation, edits, submission, approval, unlocks, and shared-goal actions

## Stack

- `client/`: React + Vite + TypeScript
- `server/`: Express + TypeScript + SQLite (`better-sqlite3`)

## Project structure

```text
client/
  src/
    components/
    api.ts
    App.tsx
    types.ts
server/
  src/
    constants.ts
    db.ts
    seedData.ts
    service.ts
    validation.ts
README.md
docs/
  phase1-analysis.md
```

## Demo users

- `Meera Iyer` - Employee
- `Arjun Singh` - Employee
- `Nisha Patel` - Employee
- `Rahul Kapoor` - Manager
- `Kavya Rao` - Admin

Use the role switcher in the UI instead of logging in.

## Run locally

```bash
npm install
npm run dev
```

This starts:

- frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

## Reset demo data

```bash
npm run seed:reset
```

## Notes

- Drafts are allowed before the weightage total reaches `100%`; the rule is enforced at submission and approval time.
- Shared goals keep their KPI definition locked for recipients; only weightage stays editable on employee sheets.
- If a shared KPI is assigned to a submitted sheet, that sheet moves back to `NEEDS_REWORK` so the employee can rebalance and resubmit.
