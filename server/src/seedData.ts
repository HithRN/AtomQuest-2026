import type { GoalSheetStatus, Role, UomType } from "./types";

interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
}

interface SeedSheet {
  id: string;
  employeeId: string;
  managerId: string;
  status: GoalSheetStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  returnComment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeedSharedGoal {
  id: string;
  createdById: string;
  ownerEmployeeId: string;
  thrustArea: string;
  title: string;
  description: string;
  uomType: UomType;
  targetValue: string;
  createdAt: string;
}

interface SeedGoal {
  id: string;
  sheetId: string;
  thrustArea: string;
  title: string;
  description: string;
  uomType: UomType;
  targetValue: string;
  weightage: number;
  sortOrder: number;
  sourceSharedGoalId: string | null;
  primaryOwnerId: string | null;
  sharedLocked: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

interface SeedAudit {
  id: string;
  actorId: string;
  actorRole: Role;
  employeeId: string | null;
  sheetId: string | null;
  goalId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export const CURRENT_CYCLE = {
  id: "cycle-fy26",
  name: "FY 2026 Goal Cycle",
  phaseLabel: "Phase 1 - Goal Setting",
  phaseWindowStart: "2026-05-01",
  phaseWindowEnd: "2026-06-15",
  createdAt: "2026-05-01T03:30:00.000Z",
};

export const SEED_USERS: SeedUser[] = [
  {
    id: "admin-kavya",
    name: "Kavya Rao",
    email: "kavya.rao@atomquest.local",
    role: "ADMIN",
    managerId: null,
  },
  {
    id: "manager-rahul",
    name: "Rahul Kapoor",
    email: "rahul.kapoor@atomquest.local",
    role: "MANAGER",
    managerId: "admin-kavya",
  },
  {
    id: "employee-meera",
    name: "Meera Iyer",
    email: "meera.iyer@atomquest.local",
    role: "EMPLOYEE",
    managerId: "manager-rahul",
  },
  {
    id: "employee-arjun",
    name: "Arjun Singh",
    email: "arjun.singh@atomquest.local",
    role: "EMPLOYEE",
    managerId: "manager-rahul",
  },
  {
    id: "employee-nisha",
    name: "Nisha Patel",
    email: "nisha.patel@atomquest.local",
    role: "EMPLOYEE",
    managerId: "manager-rahul",
  },
];

export const SEED_SHEETS: SeedSheet[] = [
  {
    id: "sheet-meera",
    employeeId: "employee-meera",
    managerId: "manager-rahul",
    status: "DRAFT",
    submittedAt: null,
    approvedAt: null,
    lockedAt: null,
    returnComment: null,
    createdAt: "2026-05-03T05:00:00.000Z",
    updatedAt: "2026-05-10T11:15:00.000Z",
  },
  {
    id: "sheet-arjun",
    employeeId: "employee-arjun",
    managerId: "manager-rahul",
    status: "SUBMITTED",
    submittedAt: "2026-05-09T09:15:00.000Z",
    approvedAt: null,
    lockedAt: null,
    returnComment: null,
    createdAt: "2026-05-03T05:00:00.000Z",
    updatedAt: "2026-05-09T09:15:00.000Z",
  },
  {
    id: "sheet-nisha",
    employeeId: "employee-nisha",
    managerId: "manager-rahul",
    status: "APPROVED_LOCKED",
    submittedAt: "2026-05-07T10:30:00.000Z",
    approvedAt: "2026-05-08T12:45:00.000Z",
    lockedAt: "2026-05-08T12:45:00.000Z",
    returnComment: null,
    createdAt: "2026-05-03T05:00:00.000Z",
    updatedAt: "2026-05-08T12:45:00.000Z",
  },
];

export const SEED_SHARED_GOALS: SeedSharedGoal[] = [
  {
    id: "shared-renewal-coverage",
    createdById: "manager-rahul",
    ownerEmployeeId: "employee-arjun",
    thrustArea: "Customer Excellence",
    title: "Raise renewal campaign coverage",
    description:
      "Ensure high-priority customers are covered by the renewal outreach motion across the region.",
    uomType: "PERCENT",
    targetValue: "85%",
    createdAt: "2026-05-04T08:00:00.000Z",
  },
];

export const SEED_GOALS: SeedGoal[] = [
  {
    id: "goal-meera-1",
    sheetId: "sheet-meera",
    thrustArea: "Customer Excellence",
    title: "Raise renewal campaign coverage",
    description:
      "Ensure high-priority customers are covered by the renewal outreach motion across the region.",
    uomType: "PERCENT",
    targetValue: "85%",
    weightage: 30,
    sortOrder: 1,
    sourceSharedGoalId: "shared-renewal-coverage",
    primaryOwnerId: "employee-arjun",
    sharedLocked: 1,
    createdAt: "2026-05-04T08:05:00.000Z",
    updatedAt: "2026-05-10T11:15:00.000Z",
  },
  {
    id: "goal-meera-2",
    sheetId: "sheet-meera",
    thrustArea: "Knowledge Management",
    title: "Launch self-service knowledge base articles",
    description: "Publish structured how-to content for the top support drivers in the queue.",
    uomType: "NUMERIC",
    targetValue: "24 articles",
    weightage: 35,
    sortOrder: 2,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T06:30:00.000Z",
    updatedAt: "2026-05-10T11:15:00.000Z",
  },
  {
    id: "goal-meera-3",
    sheetId: "sheet-meera",
    thrustArea: "Operations",
    title: "Reduce escalation reopen rate",
    description: "Tighten the closure checklist so fewer escalations return to the team.",
    uomType: "PERCENT",
    targetValue: "Below 10%",
    weightage: 35,
    sortOrder: 3,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T06:45:00.000Z",
    updatedAt: "2026-05-10T11:15:00.000Z",
  },
  {
    id: "goal-arjun-1",
    sheetId: "sheet-arjun",
    thrustArea: "Customer Excellence",
    title: "Raise renewal campaign coverage",
    description:
      "Ensure high-priority customers are covered by the renewal outreach motion across the region.",
    uomType: "PERCENT",
    targetValue: "85%",
    weightage: 25,
    sortOrder: 1,
    sourceSharedGoalId: "shared-renewal-coverage",
    primaryOwnerId: "employee-arjun",
    sharedLocked: 1,
    createdAt: "2026-05-04T08:05:00.000Z",
    updatedAt: "2026-05-09T09:15:00.000Z",
  },
  {
    id: "goal-arjun-2",
    sheetId: "sheet-arjun",
    thrustArea: "Process Excellence",
    title: "Automate onboarding checklist",
    description: "Roll out a standard automation workflow for new customer onboarding.",
    uomType: "TIMELINE",
    targetValue: "2026-06-30",
    weightage: 25,
    sortOrder: 2,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T06:40:00.000Z",
    updatedAt: "2026-05-09T09:15:00.000Z",
  },
  {
    id: "goal-arjun-3",
    sheetId: "sheet-arjun",
    thrustArea: "Service Quality",
    title: "Improve first response SLA",
    description: "Bring average first-response time into the target operating band.",
    uomType: "PERCENT",
    targetValue: "92%",
    weightage: 25,
    sortOrder: 3,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T06:50:00.000Z",
    updatedAt: "2026-05-09T09:15:00.000Z",
  },
  {
    id: "goal-arjun-4",
    sheetId: "sheet-arjun",
    thrustArea: "People Leadership",
    title: "Run manager calibration sessions",
    description: "Facilitate cross-team reviews to align quality expectations and coaching plans.",
    uomType: "NUMERIC",
    targetValue: "4 sessions",
    weightage: 25,
    sortOrder: 4,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T07:00:00.000Z",
    updatedAt: "2026-05-09T09:15:00.000Z",
  },
  {
    id: "goal-nisha-1",
    sheetId: "sheet-nisha",
    thrustArea: "Customer Excellence",
    title: "Raise renewal campaign coverage",
    description:
      "Ensure high-priority customers are covered by the renewal outreach motion across the region.",
    uomType: "PERCENT",
    targetValue: "85%",
    weightage: 20,
    sortOrder: 1,
    sourceSharedGoalId: "shared-renewal-coverage",
    primaryOwnerId: "employee-arjun",
    sharedLocked: 1,
    createdAt: "2026-05-04T08:05:00.000Z",
    updatedAt: "2026-05-08T12:45:00.000Z",
  },
  {
    id: "goal-nisha-2",
    sheetId: "sheet-nisha",
    thrustArea: "Risk & Compliance",
    title: "Zero high-severity compliance misses",
    description: "Keep severe audit misses at zero across the assigned portfolio.",
    uomType: "ZERO_BASED",
    targetValue: "0 incidents",
    weightage: 30,
    sortOrder: 2,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T07:10:00.000Z",
    updatedAt: "2026-05-08T12:45:00.000Z",
  },
  {
    id: "goal-nisha-3",
    sheetId: "sheet-nisha",
    thrustArea: "Audit Readiness",
    title: "Complete branch process audits",
    description: "Finish the planned branch audits with findings closed inside SLA.",
    uomType: "NUMERIC",
    targetValue: "12 audits",
    weightage: 50,
    sortOrder: 3,
    sourceSharedGoalId: null,
    primaryOwnerId: null,
    sharedLocked: 0,
    createdAt: "2026-05-05T07:20:00.000Z",
    updatedAt: "2026-05-08T12:45:00.000Z",
  },
];

export const SEED_AUDIT_LOGS: SeedAudit[] = [
  {
    id: "audit-1",
    actorId: "manager-rahul",
    actorRole: "MANAGER",
    employeeId: null,
    sheetId: null,
    goalId: null,
    action: "SHARED_GOAL_PUSHED",
    details: {
      title: "Raise renewal campaign coverage",
      recipients: ["employee-meera", "employee-arjun", "employee-nisha"],
      defaultWeightage: "varied per recipient at seed time",
    },
    createdAt: "2026-05-04T08:10:00.000Z",
  },
  {
    id: "audit-2",
    actorId: "employee-arjun",
    actorRole: "EMPLOYEE",
    employeeId: "employee-arjun",
    sheetId: "sheet-arjun",
    goalId: null,
    action: "GOAL_SHEET_SUBMITTED",
    details: {
      goalCount: 4,
      totalWeightage: 100,
    },
    createdAt: "2026-05-09T09:15:00.000Z",
  },
  {
    id: "audit-3",
    actorId: "manager-rahul",
    actorRole: "MANAGER",
    employeeId: "employee-nisha",
    sheetId: "sheet-nisha",
    goalId: null,
    action: "GOAL_SHEET_APPROVED",
    details: {
      note: "Initial submission approved and locked.",
    },
    createdAt: "2026-05-08T12:45:00.000Z",
  },
];
