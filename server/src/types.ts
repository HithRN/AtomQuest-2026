import type { PHASE_ONE_RULES, PHASE_TWO_PREVIEW, ROLE_VALUES, SHEET_STATUS_VALUES, UOM_VALUES } from "./constants";

export type Role = (typeof ROLE_VALUES)[number];
export type GoalSheetStatus = (typeof SHEET_STATUS_VALUES)[number];
export type UomType = (typeof UOM_VALUES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
}

export interface Goal {
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
  sharedLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalSheet {
  id: string;
  cycleId: string;
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

export interface GoalValidation {
  goalCount: number;
  totalWeightage: number;
  maxGoalsRuleSatisfied: boolean;
  minimumWeightageRuleSatisfied: boolean;
  totalWeightageRuleSatisfied: boolean;
  requiredFieldsSatisfied: boolean;
  isSubmittable: boolean;
  issues: string[];
}

export interface GoalSheetDetail {
  sheet: GoalSheet;
  employee: User;
  manager: User;
  goals: Goal[];
  validation: GoalValidation;
}

export interface GoalSheetSummary {
  id: string;
  employee: Pick<User, "id" | "name" | "email">;
  manager: Pick<User, "id" | "name" | "email">;
  status: GoalSheetStatus;
  goalCount: number;
  totalWeightage: number;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  returnComment: string | null;
  validation: GoalValidation;
}

export interface SharedGoalSummary {
  id: string;
  title: string;
  thrustArea: string;
  uomType: UomType;
  targetValue: string;
  ownerEmployeeId: string;
  ownerEmployeeName: string;
  createdById: string;
  createdByName: string;
  recipientCount: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  employeeId: string | null;
  employeeName: string | null;
  sheetId: string | null;
  goalId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface BootstrapResponse {
  currentCycle: {
    id: string;
    name: string;
    phaseLabel: string;
    phaseWindowStart: string;
    phaseWindowEnd: string;
  };
  users: User[];
  brief: {
    phaseOne: typeof PHASE_ONE_RULES;
    phaseTwoPreview: typeof PHASE_TWO_PREVIEW;
  };
}
