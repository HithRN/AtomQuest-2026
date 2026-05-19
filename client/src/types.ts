export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type GoalSheetStatus = "DRAFT" | "SUBMITTED" | "NEEDS_REWORK" | "APPROVED_LOCKED";
export type UomType = "NUMERIC" | "PERCENT" | "TIMELINE" | "ZERO_BASED";

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

export interface GoalSheetRecord {
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

export interface GoalSheetDetail {
  sheet: GoalSheetRecord;
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

export interface AdminOverview {
  sheets: GoalSheetSummary[];
  sharedGoals: SharedGoalSummary[];
  auditLogs: AuditLog[];
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
    phaseOne: {
      title: string;
      summary: string;
      mustHaves: string[];
      assumptions: string[];
      uomGuide: Array<{
        type: UomType;
        description: string;
        formulaHint: string;
      }>;
    };
    phaseTwoPreview: {
      title: string;
      summary: string;
      checkInSchedule: Array<{
        period: string;
        opens: string;
        action: string;
      }>;
    };
  };
}

export interface GoalFormInput {
  thrustArea: string;
  title: string;
  description: string;
  uomType: UomType;
  targetValue: string;
  weightage: number;
}

export interface GoalPatchInput extends Partial<GoalFormInput> {}

export interface SharedGoalCreateInput {
  thrustArea: string;
  title: string;
  description: string;
  uomType: UomType;
  targetValue: string;
  defaultWeightage: number;
  primaryOwnerId: string;
  recipientIds: string[];
}
