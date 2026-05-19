export const ROLE_VALUES = ["EMPLOYEE", "MANAGER", "ADMIN"] as const;
export const SHEET_STATUS_VALUES = [
  "DRAFT",
  "SUBMITTED",
  "NEEDS_REWORK",
  "APPROVED_LOCKED",
] as const;
export const UOM_VALUES = ["NUMERIC", "PERCENT", "TIMELINE", "ZERO_BASED"] as const;

export const PHASE_ONE_RULES = {
  title: "Phase 1 - Goal Creation & Approval",
  summary:
    "Employees create a goal sheet, managers review and approve it, approved sheets are locked, and admins can unlock or push shared departmental KPIs.",
  mustHaves: [
    "Employee interface to create and submit a goal sheet.",
    "Thrust area, goal title, description, UoM, target, and weightage on every goal.",
    "Validation rules: total weightage must equal 100%, minimum weightage per goal is 10%, and an employee can have at most 8 goals.",
    "Manager L1 workflow to edit target and weightage inline, approve, or return goals for rework.",
    "Approved goals are locked until an admin reopens the sheet.",
    "Shared departmental KPIs can be assigned by a manager or admin to multiple employees.",
  ],
  uomGuide: [
    {
      type: "NUMERIC",
      description: "Use for count or amount goals where the target is a number.",
      formulaHint: "Supports both higher-is-better and lower-is-better metrics in later phases.",
    },
    {
      type: "PERCENT",
      description: "Use for ratio or coverage goals expressed as a percentage.",
      formulaHint: "Supports both higher-is-better and lower-is-better metrics in later phases.",
    },
    {
      type: "TIMELINE",
      description: "Use for deadlines or date-based completion milestones.",
      formulaHint: "Progress is measured against completion date versus deadline in later phases.",
    },
    {
      type: "ZERO_BASED",
      description: "Use for zero-tolerance KPIs such as incidents or compliance breaches.",
      formulaHint: "Zero means success in later phases.",
    },
  ],
  assumptions: [
    "Employees can save drafts before their total weightage reaches 100%; the rule is enforced on submission and approval.",
    "Shared goals keep their KPI definition centrally locked for recipients, while weightage remains adjustable per employee.",
    "If a shared KPI is pushed onto a submitted sheet, that sheet moves to rework so the employee can rebalance weightage and resubmit.",
  ],
} as const;

export const PHASE_TWO_PREVIEW = {
  title: "Phase 2 Preview",
  summary:
    "Quarterly achievement updates, status tracking, and manager check-in comments are intentionally left as future work so this codebase can grow into the full BRD.",
  checkInSchedule: [
    { period: "Phase 1 - Goal Setting", opens: "1st May", action: "Goal creation, submission, and approval" },
    { period: "Q1 Check-in", opens: "July", action: "Planned vs. actual progress update" },
    { period: "Q2 Check-in", opens: "October", action: "Planned vs. actual progress update" },
    { period: "Q3 Check-in", opens: "January", action: "Planned vs. actual progress update" },
    { period: "Q4 / Annual", opens: "March / April", action: "Final achievement capture" },
  ],
} as const;

export const API_PORT = 4000;
