import { randomUUID } from "node:crypto";
import { PHASE_ONE_RULES, PHASE_TWO_PREVIEW } from "./constants";
import { getDb } from "./db";
import type {
  AuditLog,
  BootstrapResponse,
  Goal,
  GoalSheet,
  GoalSheetDetail,
  GoalSheetSummary,
  GoalSheetStatus,
  Role,
  SharedGoalSummary,
  User,
} from "./types";
import {
  calculateGoalValidation,
  roundWeightage,
  type CreateGoalInput,
  type SharedGoalInput,
  type UpdateGoalInput,
} from "./validation";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
}

interface GoalRow {
  id: string;
  sheetId: string;
  thrustArea: string;
  title: string;
  description: string;
  uomType: Goal["uomType"];
  targetValue: string;
  weightage: number;
  sortOrder: number;
  sourceSharedGoalId: string | null;
  primaryOwnerId: string | null;
  sharedLocked: number;
  createdAt: string;
  updatedAt: string;
}

interface GoalSheetJoinedRow {
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
  employeeName: string;
  employeeEmail: string;
  employeeManagerId: string | null;
  managerName: string;
  managerEmail: string;
  managerManagerId: string | null;
}

interface CycleRow {
  id: string;
  name: string;
  phaseLabel: string;
  phaseWindowStart: string;
  phaseWindowEnd: string;
}

interface SharedGoalRow {
  id: string;
  title: string;
  thrustArea: string;
  uomType: Goal["uomType"];
  targetValue: string;
  ownerEmployeeId: string;
  ownerEmployeeName: string;
  createdById: string;
  createdByName: string;
  recipientCount: number;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  employeeId: string | null;
  employeeName: string | null;
  sheetId: string | null;
  goalId: string | null;
  action: string;
  details: string;
  createdAt: string;
}

interface GoalContext {
  goal: Goal;
  sheet: GoalSheetDetail["sheet"];
  employee: User;
  manager: User;
}

interface GoalContextRow extends GoalRow {
  sheetCycleId: string;
  sheetEmployeeId: string;
  sheetManagerId: string;
  sheetStatus: GoalSheetStatus;
  sheetSubmittedAt: string | null;
  sheetApprovedAt: string | null;
  sheetLockedAt: string | null;
  sheetReturnComment: string | null;
  sheetCreatedAt: string;
  sheetUpdatedAt: string;
}

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    managerId: row.managerId,
  };
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    sheetId: row.sheetId,
    thrustArea: row.thrustArea,
    title: row.title,
    description: row.description,
    uomType: row.uomType,
    targetValue: row.targetValue,
    weightage: roundWeightage(row.weightage),
    sortOrder: row.sortOrder,
    sourceSharedGoalId: row.sourceSharedGoalId,
    primaryOwnerId: row.primaryOwnerId,
    sharedLocked: Boolean(row.sharedLocked),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorName,
    actorRole: row.actorRole,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    sheetId: row.sheetId,
    goalId: row.goalId,
    action: row.action,
    details: JSON.parse(row.details) as Record<string, unknown>,
    createdAt: row.createdAt,
  };
}

function requireRole(user: User, allowed: Role[]) {
  if (!allowed.includes(user.role)) {
    throw new AppError(403, `This action requires one of the following roles: ${allowed.join(", ")}.`);
  }
}

function getCurrentCycleRow(): CycleRow {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT id, name, phaseLabel, phaseWindowStart, phaseWindowEnd
      FROM cycles
      ORDER BY createdAt DESC
      LIMIT 1
    `)
    .get() as CycleRow | undefined;

  if (!row) {
    throw new AppError(500, "No active cycle is configured.");
  }

  return row;
}

function getUserOrThrow(userId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;

  if (!row) {
    throw new AppError(404, "User not found.");
  }

  return mapUser(row);
}

function updateSheetTimestamp(sheetId: string, timestamp = nowIso()) {
  const db = getDb();
  db.prepare("UPDATE goal_sheets SET updatedAt = ? WHERE id = ?").run(timestamp, sheetId);
}

function logAudit(entry: {
  actor: User;
  employeeId?: string | null;
  sheetId?: string | null;
  goalId?: string | null;
  action: string;
  details: Record<string, unknown>;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (
      id, actorId, actorRole, employeeId, sheetId, goalId, action, details, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    entry.actor.id,
    entry.actor.role,
    entry.employeeId ?? null,
    entry.sheetId ?? null,
    entry.goalId ?? null,
    entry.action,
    JSON.stringify(entry.details),
    nowIso(),
  );
}

function getOrCreateEmployeeSheet(employeeId: string): GoalSheet {
  const db = getDb();
  const cycle = getCurrentCycleRow();
  const employee = getUserOrThrow(employeeId);

  if (employee.role !== "EMPLOYEE" || !employee.managerId) {
    throw new AppError(400, "Only employees with an assigned manager can own goal sheets.");
  }

  const existing = db
    .prepare("SELECT * FROM goal_sheets WHERE cycleId = ? AND employeeId = ?")
    .get(cycle.id, employeeId) as GoalSheet | undefined;

  if (existing) {
    return existing;
  }

  const createdAt = nowIso();
  const newSheet: GoalSheet = {
    id: randomUUID(),
    cycleId: cycle.id,
    employeeId,
    managerId: employee.managerId,
    status: "DRAFT",
    submittedAt: null,
    approvedAt: null,
    lockedAt: null,
    returnComment: null,
    createdAt,
    updatedAt: createdAt,
  };

  db.prepare(`
    INSERT INTO goal_sheets (
      id, cycleId, employeeId, managerId, status, submittedAt, approvedAt, lockedAt, returnComment, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newSheet.id,
    newSheet.cycleId,
    newSheet.employeeId,
    newSheet.managerId,
    newSheet.status,
    newSheet.submittedAt,
    newSheet.approvedAt,
    newSheet.lockedAt,
    newSheet.returnComment,
    newSheet.createdAt,
    newSheet.updatedAt,
  );

  return newSheet;
}

function getGoalRowsBySheetId(sheetId: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM goals WHERE sheetId = ? ORDER BY sortOrder ASC, createdAt ASC")
    .all(sheetId) as GoalRow[];
}

function buildSheetDetailFromRow(row: GoalSheetJoinedRow): GoalSheetDetail {
  const goals = getGoalRowsBySheetId(row.id).map(mapGoal);
  const validation = calculateGoalValidation(goals);

  return {
    sheet: {
      id: row.id,
      cycleId: row.cycleId,
      employeeId: row.employeeId,
      managerId: row.managerId,
      status: row.status,
      submittedAt: row.submittedAt,
      approvedAt: row.approvedAt,
      lockedAt: row.lockedAt,
      returnComment: row.returnComment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    employee: {
      id: row.employeeId,
      name: row.employeeName,
      email: row.employeeEmail,
      role: "EMPLOYEE",
      managerId: row.employeeManagerId,
    },
    manager: {
      id: row.managerId,
      name: row.managerName,
      email: row.managerEmail,
      role: "MANAGER",
      managerId: row.managerManagerId,
    },
    goals,
    validation,
  };
}

function getSheetJoinedRowById(sheetId: string) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT
        s.*,
        employee.name AS employeeName,
        employee.email AS employeeEmail,
        employee.managerId AS employeeManagerId,
        manager.name AS managerName,
        manager.email AS managerEmail,
        manager.managerId AS managerManagerId
      FROM goal_sheets s
      JOIN users employee ON employee.id = s.employeeId
      JOIN users manager ON manager.id = s.managerId
      WHERE s.id = ?
    `)
    .get(sheetId) as GoalSheetJoinedRow | undefined;

  if (!row) {
    throw new AppError(404, "Goal sheet not found.");
  }

  return row;
}

function getSheetDetailById(sheetId: string) {
  return buildSheetDetailFromRow(getSheetJoinedRowById(sheetId));
}

function getSheetDetailForEmployee(employeeId: string) {
  const sheet = getOrCreateEmployeeSheet(employeeId);
  return getSheetDetailById(sheet.id);
}

function toSheetSummary(detail: GoalSheetDetail): GoalSheetSummary {
  return {
    id: detail.sheet.id,
    employee: {
      id: detail.employee.id,
      name: detail.employee.name,
      email: detail.employee.email,
    },
    manager: {
      id: detail.manager.id,
      name: detail.manager.name,
      email: detail.manager.email,
    },
    status: detail.sheet.status,
    goalCount: detail.validation.goalCount,
    totalWeightage: detail.validation.totalWeightage,
    updatedAt: detail.sheet.updatedAt,
    submittedAt: detail.sheet.submittedAt,
    approvedAt: detail.sheet.approvedAt,
    lockedAt: detail.sheet.lockedAt,
    returnComment: detail.sheet.returnComment,
    validation: detail.validation,
  };
}

function listAllSheetSummaries() {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id
      FROM goal_sheets
      ORDER BY updatedAt DESC, createdAt DESC
    `)
    .all() as Array<{ id: string }>;

  return rows.map((row) => toSheetSummary(getSheetDetailById(row.id)));
}

function getGoalContext(goalId: string): GoalContext {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT
        g.*,
        s.cycleId AS sheetCycleId,
        s.employeeId AS sheetEmployeeId,
        s.managerId AS sheetManagerId,
        s.status AS sheetStatus,
        s.submittedAt AS sheetSubmittedAt,
        s.approvedAt AS sheetApprovedAt,
        s.lockedAt AS sheetLockedAt,
        s.returnComment AS sheetReturnComment,
        s.createdAt AS sheetCreatedAt,
        s.updatedAt AS sheetUpdatedAt
      FROM goals g
      JOIN goal_sheets s ON s.id = g.sheetId
      WHERE g.id = ?
    `)
    .get(goalId) as GoalContextRow | undefined;

  if (!row) {
    throw new AppError(404, "Goal not found.");
  }

  const employee = getUserOrThrow(row.sheetEmployeeId);
  const manager = getUserOrThrow(row.sheetManagerId);

  return {
    goal: mapGoal(row),
    sheet: {
      id: row.sheetId,
      cycleId: row.sheetCycleId,
      employeeId: row.sheetEmployeeId,
      managerId: row.sheetManagerId,
      status: row.sheetStatus,
      submittedAt: row.sheetSubmittedAt,
      approvedAt: row.sheetApprovedAt,
      lockedAt: row.sheetLockedAt,
      returnComment: row.sheetReturnComment,
      createdAt: row.sheetCreatedAt,
      updatedAt: row.sheetUpdatedAt,
    },
    employee,
    manager,
  };
}

function ensureEmployeeEditableSheet(sheet: GoalSheet, actor: User) {
  if (actor.role !== "EMPLOYEE" || actor.id !== sheet.employeeId) {
    throw new AppError(403, "Employees can only edit their own goal sheets.");
  }

  if (!["DRAFT", "NEEDS_REWORK"].includes(sheet.status)) {
    throw new AppError(409, "This goal sheet is locked for employee edits.");
  }
}

function ensureManagerOwnsSheet(sheet: GoalSheet, actor: User) {
  if (actor.role !== "MANAGER" || actor.id !== sheet.managerId) {
    throw new AppError(403, "Only the assigned manager can review this goal sheet.");
  }
}

function diffPayload(previous: Goal, next: Goal, keys: Array<keyof Goal>) {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const key of keys) {
    if (previous[key] !== next[key]) {
      changes[key] = {
        before: previous[key],
        after: next[key],
      };
    }
  }

  return changes;
}

export function getBootstrapData(): BootstrapResponse {
  const db = getDb();
  const currentCycle = getCurrentCycleRow();
  const users = db
    .prepare(`
      SELECT *
      FROM users
      ORDER BY
        CASE role
          WHEN 'ADMIN' THEN 1
          WHEN 'MANAGER' THEN 2
          ELSE 3
        END,
        name ASC
    `)
    .all() as UserRow[];

  return {
    currentCycle,
    users: users.map(mapUser),
    brief: {
      phaseOne: PHASE_ONE_RULES,
      phaseTwoPreview: PHASE_TWO_PREVIEW,
    },
  };
}

export function getUserById(userId: string) {
  return getUserOrThrow(userId);
}

export function getMyGoalSheet(actor: User) {
  requireRole(actor, ["EMPLOYEE"]);
  return getSheetDetailForEmployee(actor.id);
}

export function addGoalToMySheet(actor: User, input: CreateGoalInput) {
  requireRole(actor, ["EMPLOYEE"]);

  const sheet = getOrCreateEmployeeSheet(actor.id);
  ensureEmployeeEditableSheet(sheet, actor);

  const existingGoals = getGoalRowsBySheetId(sheet.id).map(mapGoal);

  if (existingGoals.length >= 8) {
    throw new AppError(422, "An employee cannot have more than 8 goals.");
  }

  const timestamp = nowIso();
  const nextSortOrder = existingGoals.length + 1;
  const goalId = randomUUID();
  const db = getDb();

  db.prepare(`
    INSERT INTO goals (
      id, sheetId, thrustArea, title, description, uomType, targetValue, weightage, sortOrder,
      sourceSharedGoalId, primaryOwnerId, sharedLocked, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goalId,
    sheet.id,
    input.thrustArea.trim(),
    input.title.trim(),
    input.description.trim(),
    input.uomType,
    input.targetValue.trim(),
    roundWeightage(input.weightage),
    nextSortOrder,
    null,
    null,
    0,
    timestamp,
    timestamp,
  );

  updateSheetTimestamp(sheet.id, timestamp);

  logAudit({
    actor,
    employeeId: actor.id,
    sheetId: sheet.id,
    goalId,
    action: "GOAL_CREATED",
    details: {
      title: input.title,
      weightage: roundWeightage(input.weightage),
    },
  });

  return getSheetDetailById(sheet.id);
}

export function updateGoal(actor: User, goalId: string, input: UpdateGoalInput) {
  const context = getGoalContext(goalId);
  const currentGoal = context.goal;
  const db = getDb();

  let allowedKeys: Array<keyof UpdateGoalInput>;

  if (actor.role === "EMPLOYEE") {
    ensureEmployeeEditableSheet(context.sheet, actor);

    if (currentGoal.sharedLocked) {
      allowedKeys = ["weightage"];
    } else {
      allowedKeys = ["thrustArea", "title", "description", "uomType", "targetValue", "weightage"];
    }
  } else if (actor.role === "MANAGER") {
    ensureManagerOwnsSheet(context.sheet, actor);

    if (context.sheet.status !== "SUBMITTED") {
      throw new AppError(409, "Managers can only edit goals while a sheet is awaiting review.");
    }

    allowedKeys = currentGoal.sharedLocked ? ["weightage"] : ["targetValue", "weightage"];
  } else {
    throw new AppError(403, "Admins can unlock sheets and assign shared goals, but do not edit goals inline.");
  }

  const filteredEntries = Object.entries(input).filter(([key]) =>
    allowedKeys.includes(key as keyof UpdateGoalInput),
  ) as Array<[keyof UpdateGoalInput, UpdateGoalInput[keyof UpdateGoalInput]]>;

  if (filteredEntries.length === 0) {
    throw new AppError(422, "No editable fields were provided for this goal.");
  }

  const patch = Object.fromEntries(filteredEntries) as Partial<UpdateGoalInput>;
  const nextGoal: Goal = {
    ...currentGoal,
    thrustArea: patch.thrustArea?.trim() ?? currentGoal.thrustArea,
    title: patch.title?.trim() ?? currentGoal.title,
    description: patch.description?.trim() ?? currentGoal.description,
    uomType: patch.uomType ?? currentGoal.uomType,
    targetValue: patch.targetValue?.trim() ?? currentGoal.targetValue,
    weightage:
      patch.weightage !== undefined ? roundWeightage(patch.weightage) : currentGoal.weightage,
    updatedAt: nowIso(),
  };

  const changes = diffPayload(currentGoal, nextGoal, [
    "thrustArea",
    "title",
    "description",
    "uomType",
    "targetValue",
    "weightage",
  ]);

  db.prepare(`
    UPDATE goals
    SET thrustArea = ?, title = ?, description = ?, uomType = ?, targetValue = ?, weightage = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    nextGoal.thrustArea,
    nextGoal.title,
    nextGoal.description,
    nextGoal.uomType,
    nextGoal.targetValue,
    nextGoal.weightage,
    nextGoal.updatedAt,
    goalId,
  );

  updateSheetTimestamp(context.sheet.id, nextGoal.updatedAt);

  if (Object.keys(changes).length > 0) {
    logAudit({
      actor,
      employeeId: context.employee.id,
      sheetId: context.sheet.id,
      goalId,
      action: actor.role === "MANAGER" ? "GOAL_EDITED_BY_MANAGER" : "GOAL_EDITED_BY_EMPLOYEE",
      details: changes,
    });
  }

  return getSheetDetailById(context.sheet.id);
}

export function deleteGoal(actor: User, goalId: string) {
  requireRole(actor, ["EMPLOYEE"]);
  const context = getGoalContext(goalId);
  ensureEmployeeEditableSheet(context.sheet, actor);

  if (context.goal.sharedLocked) {
    throw new AppError(409, "Shared goals cannot be deleted by employees.");
  }

  const db = getDb();

  db.prepare("DELETE FROM goals WHERE id = ?").run(goalId);

  const remainingGoalIds = getGoalRowsBySheetId(context.sheet.id);
  const reorder = db.prepare("UPDATE goals SET sortOrder = ? WHERE id = ?");
  const transaction = db.transaction(() => {
    remainingGoalIds.forEach((goal, index) => {
      reorder.run(index + 1, goal.id);
    });
  });
  transaction();

  const timestamp = nowIso();
  updateSheetTimestamp(context.sheet.id, timestamp);

  logAudit({
    actor,
    employeeId: actor.id,
    sheetId: context.sheet.id,
    goalId,
    action: "GOAL_DELETED",
    details: {
      title: context.goal.title,
      previousWeightage: context.goal.weightage,
    },
  });

  return getSheetDetailById(context.sheet.id);
}

export function submitMyGoalSheet(actor: User) {
  requireRole(actor, ["EMPLOYEE"]);
  const detail = getSheetDetailForEmployee(actor.id);
  ensureEmployeeEditableSheet(detail.sheet, actor);

  if (!detail.validation.isSubmittable) {
    throw new AppError(422, "This goal sheet does not satisfy the Phase 1 validation rules.", detail.validation);
  }

  const timestamp = nowIso();
  const db = getDb();
  db.prepare(`
    UPDATE goal_sheets
    SET status = 'SUBMITTED', submittedAt = ?, returnComment = NULL, updatedAt = ?
    WHERE id = ?
  `).run(timestamp, timestamp, detail.sheet.id);

  logAudit({
    actor,
    employeeId: actor.id,
    sheetId: detail.sheet.id,
    action: "GOAL_SHEET_SUBMITTED",
    details: {
      goalCount: detail.validation.goalCount,
      totalWeightage: detail.validation.totalWeightage,
    },
  });

  return getSheetDetailById(detail.sheet.id);
}

export function getManagerTeamSheets(actor: User) {
  requireRole(actor, ["MANAGER"]);
  return listAllSheetSummaries().filter((sheet) => sheet.manager.id === actor.id);
}

export function getGoalSheet(actor: User, sheetId: string) {
  const detail = getSheetDetailById(sheetId);

  if (actor.role === "EMPLOYEE" && actor.id !== detail.employee.id) {
    throw new AppError(403, "Employees can only view their own goal sheet.");
  }

  if (actor.role === "MANAGER" && actor.id !== detail.manager.id) {
    throw new AppError(403, "Managers can only view their team members' goal sheets.");
  }

  return detail;
}

export function approveGoalSheet(actor: User, sheetId: string) {
  const detail = getGoalSheet(actor, sheetId);
  requireRole(actor, ["MANAGER"]);
  ensureManagerOwnsSheet(detail.sheet, actor);

  if (detail.sheet.status !== "SUBMITTED") {
    throw new AppError(409, "Only submitted goal sheets can be approved.");
  }

  if (!detail.validation.isSubmittable) {
    throw new AppError(
      422,
      "This goal sheet cannot be approved because it no longer satisfies the Phase 1 rules.",
      detail.validation,
    );
  }

  const timestamp = nowIso();
  const db = getDb();
  db.prepare(`
    UPDATE goal_sheets
    SET status = 'APPROVED_LOCKED', approvedAt = ?, lockedAt = ?, returnComment = NULL, updatedAt = ?
    WHERE id = ?
  `).run(timestamp, timestamp, timestamp, sheetId);

  logAudit({
    actor,
    employeeId: detail.employee.id,
    sheetId,
    action: "GOAL_SHEET_APPROVED",
    details: {
      goalCount: detail.validation.goalCount,
      totalWeightage: detail.validation.totalWeightage,
    },
  });

  return getSheetDetailById(sheetId);
}

export function returnGoalSheetForRework(actor: User, sheetId: string, comment: string) {
  const detail = getGoalSheet(actor, sheetId);
  requireRole(actor, ["MANAGER"]);
  ensureManagerOwnsSheet(detail.sheet, actor);

  if (detail.sheet.status !== "SUBMITTED") {
    throw new AppError(409, "Only submitted goal sheets can be returned for rework.");
  }

  const timestamp = nowIso();
  const db = getDb();
  db.prepare(`
    UPDATE goal_sheets
    SET status = 'NEEDS_REWORK', returnComment = ?, updatedAt = ?
    WHERE id = ?
  `).run(comment.trim(), timestamp, sheetId);

  logAudit({
    actor,
    employeeId: detail.employee.id,
    sheetId,
    action: "GOAL_SHEET_RETURNED",
    details: {
      comment: comment.trim(),
    },
  });

  return getSheetDetailById(sheetId);
}

export function unlockGoalSheet(actor: User, sheetId: string, reason: string) {
  requireRole(actor, ["ADMIN"]);
  const detail = getSheetDetailById(sheetId);

  if (detail.sheet.status !== "APPROVED_LOCKED") {
    throw new AppError(409, "Only approved and locked goal sheets can be unlocked.");
  }

  const timestamp = nowIso();
  const db = getDb();
  db.prepare(`
    UPDATE goal_sheets
    SET status = 'NEEDS_REWORK', approvedAt = NULL, lockedAt = NULL, returnComment = ?, updatedAt = ?
    WHERE id = ?
  `).run(`Admin unlock: ${reason.trim()}`, timestamp, sheetId);

  logAudit({
    actor,
    employeeId: detail.employee.id,
    sheetId,
    action: "GOAL_SHEET_UNLOCKED",
    details: {
      reason: reason.trim(),
      previousLockedAt: detail.sheet.lockedAt,
    },
  });

  return getSheetDetailById(sheetId);
}

export function createSharedGoal(actor: User, input: SharedGoalInput) {
  requireRole(actor, ["ADMIN", "MANAGER"]);

  const recipientIds = [...new Set(input.recipientIds)];

  if (!recipientIds.includes(input.primaryOwnerId)) {
    throw new AppError(422, "The primary owner must also be one of the recipients.");
  }

  const recipients = recipientIds.map((recipientId) => getUserOrThrow(recipientId));

  for (const recipient of recipients) {
    if (recipient.role !== "EMPLOYEE") {
      throw new AppError(422, "Shared goals can only be assigned to employees.");
    }

    if (actor.role === "MANAGER" && recipient.managerId !== actor.id) {
      throw new AppError(403, "Managers can only assign shared goals to their own team members.");
    }
  }

  const targetSheets = recipients.map((recipient) => getOrCreateEmployeeSheet(recipient.id));
  for (const sheet of targetSheets) {
    const goalCount = getGoalRowsBySheetId(sheet.id).length;
    if (goalCount >= 8) {
      throw new AppError(
        422,
        `Cannot push the shared KPI because ${getUserOrThrow(sheet.employeeId).name} already has 8 goals.`,
      );
    }

    if (sheet.status === "APPROVED_LOCKED") {
      throw new AppError(
        409,
        `Unlock ${getUserOrThrow(sheet.employeeId).name}'s goal sheet before assigning a new shared KPI.`,
      );
    }
  }

  const timestamp = nowIso();
  const db = getDb();
  const currentCycle = getCurrentCycleRow();
  const sharedGoalId = randomUUID();

  const insertSharedGoal = db.prepare(`
    INSERT INTO shared_goals (
      id, cycleId, createdById, ownerEmployeeId, thrustArea, title, description, uomType, targetValue, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGoal = db.prepare(`
    INSERT INTO goals (
      id, sheetId, thrustArea, title, description, uomType, targetValue, weightage, sortOrder,
      sourceSharedGoalId, primaryOwnerId, sharedLocked, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateSheet = db.prepare(`
    UPDATE goal_sheets
    SET status = ?, returnComment = ?, updatedAt = ?
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    insertSharedGoal.run(
      sharedGoalId,
      currentCycle.id,
      actor.id,
      input.primaryOwnerId,
      input.thrustArea.trim(),
      input.title.trim(),
      input.description.trim(),
      input.uomType,
      input.targetValue.trim(),
      timestamp,
    );

    for (const sheet of targetSheets) {
      const nextSortOrder = getGoalRowsBySheetId(sheet.id).length + 1;
      insertGoal.run(
        randomUUID(),
        sheet.id,
        input.thrustArea.trim(),
        input.title.trim(),
        input.description.trim(),
        input.uomType,
        input.targetValue.trim(),
        roundWeightage(input.defaultWeightage),
        nextSortOrder,
        sharedGoalId,
        input.primaryOwnerId,
        1,
        timestamp,
        timestamp,
      );

      const shouldMoveToRework = sheet.status === "SUBMITTED";
      updateSheet.run(
        shouldMoveToRework ? "NEEDS_REWORK" : sheet.status,
        shouldMoveToRework ? "Shared KPI assigned. Rebalance weightage and resubmit." : sheet.returnComment,
        timestamp,
        sheet.id,
      );
    }
  });

  transaction();

  for (const recipient of recipients) {
    const recipientSheet = targetSheets.find((sheet) => sheet.employeeId === recipient.id);
    logAudit({
      actor,
      employeeId: recipient.id,
      sheetId: recipientSheet?.id ?? null,
      action: "SHARED_GOAL_PUSHED",
      details: {
        title: input.title.trim(),
        targetValue: input.targetValue.trim(),
        defaultWeightage: roundWeightage(input.defaultWeightage),
        primaryOwnerId: input.primaryOwnerId,
      },
    });
  }

  return {
    sharedGoalId,
    affectedSheets: targetSheets.map((sheet) => getSheetDetailById(sheet.id)),
  };
}

export function getAdminOverview(actor: User) {
  requireRole(actor, ["ADMIN"]);
  return {
    sheets: listAllSheetSummaries(),
    sharedGoals: listSharedGoals(),
    auditLogs: listAuditLogs(),
  };
}

export function listSharedGoals(): SharedGoalSummary[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        sg.id,
        sg.title,
        sg.thrustArea,
        sg.uomType,
        sg.targetValue,
        sg.ownerEmployeeId,
        owner.name AS ownerEmployeeName,
        sg.createdById,
        creator.name AS createdByName,
        COUNT(g.id) AS recipientCount,
        sg.createdAt
      FROM shared_goals sg
      JOIN users owner ON owner.id = sg.ownerEmployeeId
      JOIN users creator ON creator.id = sg.createdById
      LEFT JOIN goals g ON g.sourceSharedGoalId = sg.id
      GROUP BY sg.id
      ORDER BY sg.createdAt DESC
    `)
    .all() as SharedGoalRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    thrustArea: row.thrustArea,
    uomType: row.uomType,
    targetValue: row.targetValue,
    ownerEmployeeId: row.ownerEmployeeId,
    ownerEmployeeName: row.ownerEmployeeName,
    createdById: row.createdById,
    createdByName: row.createdByName,
    recipientCount: Number(row.recipientCount),
    createdAt: row.createdAt,
  }));
}

export function listAuditLogs(limit = 50) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        logs.*,
        actor.name AS actorName,
        employee.name AS employeeName
      FROM audit_logs logs
      JOIN users actor ON actor.id = logs.actorId
      LEFT JOIN users employee ON employee.id = logs.employeeId
      ORDER BY logs.createdAt DESC
      LIMIT ?
    `)
    .all(limit) as AuditLogRow[];

  return rows.map(mapAuditLog);
}
