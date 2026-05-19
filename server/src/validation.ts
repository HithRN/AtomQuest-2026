import { z } from "zod";
import { UOM_VALUES } from "./constants";
import type { Goal, GoalValidation } from "./types";

const nonEmptyText = z.string().trim().min(1).max(240);
const longText = z.string().trim().min(1).max(2000);

export const createGoalSchema = z.object({
  thrustArea: nonEmptyText,
  title: nonEmptyText,
  description: longText,
  uomType: z.enum(UOM_VALUES),
  targetValue: z.string().trim().min(1).max(240),
  weightage: z.coerce.number().min(0).max(100),
});

export const updateGoalSchema = z
  .object({
    thrustArea: nonEmptyText.optional(),
    title: nonEmptyText.optional(),
    description: longText.optional(),
    uomType: z.enum(UOM_VALUES).optional(),
    targetValue: z.string().trim().min(1).max(240).optional(),
    weightage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be updated.",
  });

export const returnSheetSchema = z.object({
  comment: z.string().trim().min(3).max(500),
});

export const unlockSheetSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const sharedGoalSchema = z.object({
  thrustArea: nonEmptyText,
  title: nonEmptyText,
  description: longText,
  uomType: z.enum(UOM_VALUES),
  targetValue: z.string().trim().min(1).max(240),
  defaultWeightage: z.coerce.number().min(10).max(100),
  primaryOwnerId: z.string().trim().min(1),
  recipientIds: z.array(z.string().trim().min(1)).min(1).max(25),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ReturnSheetInput = z.infer<typeof returnSheetSchema>;
export type UnlockSheetInput = z.infer<typeof unlockSheetSchema>;
export type SharedGoalInput = z.infer<typeof sharedGoalSchema>;

export function roundWeightage(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateGoalValidation(goals: Goal[]): GoalValidation {
  const totalWeightage = roundWeightage(
    goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0),
  );

  const issues: string[] = [];
  const minimumWeightageRuleSatisfied = goals.every((goal) => goal.weightage >= 10);
  const maxGoalsRuleSatisfied = goals.length <= 8;
  const totalWeightageRuleSatisfied = Math.abs(totalWeightage - 100) < 0.01;
  const requiredFieldsSatisfied = goals.every(
    (goal) =>
      goal.thrustArea.trim() &&
      goal.title.trim() &&
      goal.description.trim() &&
      goal.targetValue.trim() &&
      goal.uomType,
  );

  if (goals.length === 0) {
    issues.push("At least one goal must exist before submission.");
  }

  if (!maxGoalsRuleSatisfied) {
    issues.push("An employee cannot have more than 8 goals.");
  }

  if (!minimumWeightageRuleSatisfied) {
    issues.push("Every individual goal must carry at least 10% weightage.");
  }

  if (!totalWeightageRuleSatisfied) {
    issues.push(`Total weightage must equal 100%. Current total: ${totalWeightage}%.`);
  }

  if (!requiredFieldsSatisfied) {
    issues.push("Every goal must include thrust area, title, description, UoM, target, and weightage.");
  }

  return {
    goalCount: goals.length,
    totalWeightage,
    maxGoalsRuleSatisfied,
    minimumWeightageRuleSatisfied,
    totalWeightageRuleSatisfied,
    requiredFieldsSatisfied,
    isSubmittable: issues.length === 0,
    issues,
  };
}
