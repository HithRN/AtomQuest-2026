import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  CURRENT_CYCLE,
  SEED_AUDIT_LOGS,
  SEED_GOALS,
  SEED_SHARED_GOALS,
  SEED_SHEETS,
  SEED_USERS,
} from "./seedData";

type BetterSqliteDatabase = Database.Database;

const DATA_DIRECTORY = path.resolve(__dirname, "../data");
const DATABASE_PATH = path.join(DATA_DIRECTORY, "goal-portal.db");

let database: BetterSqliteDatabase | null = null;

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
}

function createConnection() {
  ensureDataDirectory();

  const db = new Database(DATABASE_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      managerId TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phaseLabel TEXT NOT NULL,
      phaseWindowStart TEXT NOT NULL,
      phaseWindowEnd TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goal_sheets (
      id TEXT PRIMARY KEY,
      cycleId TEXT NOT NULL REFERENCES cycles(id),
      employeeId TEXT NOT NULL REFERENCES users(id),
      managerId TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      submittedAt TEXT,
      approvedAt TEXT,
      lockedAt TEXT,
      returnComment TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(cycleId, employeeId)
    );

    CREATE TABLE IF NOT EXISTS shared_goals (
      id TEXT PRIMARY KEY,
      cycleId TEXT NOT NULL REFERENCES cycles(id),
      createdById TEXT NOT NULL REFERENCES users(id),
      ownerEmployeeId TEXT NOT NULL REFERENCES users(id),
      thrustArea TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      uomType TEXT NOT NULL,
      targetValue TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      sheetId TEXT NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
      thrustArea TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      uomType TEXT NOT NULL,
      targetValue TEXT NOT NULL,
      weightage REAL NOT NULL,
      sortOrder INTEGER NOT NULL,
      sourceSharedGoalId TEXT REFERENCES shared_goals(id),
      primaryOwnerId TEXT REFERENCES users(id),
      sharedLocked INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actorId TEXT NOT NULL REFERENCES users(id),
      actorRole TEXT NOT NULL,
      employeeId TEXT REFERENCES users(id),
      sheetId TEXT REFERENCES goal_sheets(id),
      goalId TEXT REFERENCES goals(id),
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  return db;
}

function seedDatabase(db: BetterSqliteDatabase) {
  const insertUsers = db.prepare(`
    INSERT INTO users (id, name, email, role, managerId)
    VALUES (@id, @name, @email, @role, @managerId)
  `);
  const insertCycle = db.prepare(`
    INSERT INTO cycles (id, name, phaseLabel, phaseWindowStart, phaseWindowEnd, createdAt)
    VALUES (@id, @name, @phaseLabel, @phaseWindowStart, @phaseWindowEnd, @createdAt)
  `);
  const insertSheet = db.prepare(`
    INSERT INTO goal_sheets (
      id, cycleId, employeeId, managerId, status, submittedAt, approvedAt, lockedAt,
      returnComment, createdAt, updatedAt
    ) VALUES (
      @id, @cycleId, @employeeId, @managerId, @status, @submittedAt, @approvedAt, @lockedAt,
      @returnComment, @createdAt, @updatedAt
    )
  `);
  const insertSharedGoal = db.prepare(`
    INSERT INTO shared_goals (
      id, cycleId, createdById, ownerEmployeeId, thrustArea, title, description, uomType, targetValue, createdAt
    ) VALUES (
      @id, @cycleId, @createdById, @ownerEmployeeId, @thrustArea, @title, @description, @uomType, @targetValue, @createdAt
    )
  `);
  const insertGoal = db.prepare(`
    INSERT INTO goals (
      id, sheetId, thrustArea, title, description, uomType, targetValue, weightage, sortOrder,
      sourceSharedGoalId, primaryOwnerId, sharedLocked, createdAt, updatedAt
    ) VALUES (
      @id, @sheetId, @thrustArea, @title, @description, @uomType, @targetValue, @weightage, @sortOrder,
      @sourceSharedGoalId, @primaryOwnerId, @sharedLocked, @createdAt, @updatedAt
    )
  `);
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (
      id, actorId, actorRole, employeeId, sheetId, goalId, action, details, createdAt
    ) VALUES (
      @id, @actorId, @actorRole, @employeeId, @sheetId, @goalId, @action, @details, @createdAt
    )
  `);

  const seed = db.transaction(() => {
    for (const user of SEED_USERS) {
      insertUsers.run(user);
    }

    insertCycle.run(CURRENT_CYCLE);

    for (const sheet of SEED_SHEETS) {
      insertSheet.run({ ...sheet, cycleId: CURRENT_CYCLE.id });
    }

    for (const sharedGoal of SEED_SHARED_GOALS) {
      insertSharedGoal.run({ ...sharedGoal, cycleId: CURRENT_CYCLE.id });
    }

    for (const goal of SEED_GOALS) {
      insertGoal.run(goal);
    }

    for (const audit of SEED_AUDIT_LOGS) {
      insertAudit.run({ ...audit, details: JSON.stringify(audit.details) });
    }
  });

  seed();
}

function seedIfEmpty(db: BetterSqliteDatabase) {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };

  if (countRow.count === 0) {
    seedDatabase(db);
  }
}

export function getDb() {
  if (!database) {
    database = createConnection();
    seedIfEmpty(database);
  }

  return database;
}

export function initializeDatabase() {
  return getDb();
}

export function resetDatabase() {
  if (database) {
    database.close();
    database = null;
  }

  fs.rmSync(DATABASE_PATH, { force: true });

  const db = createConnection();
  seedDatabase(db);
  database = db;

  return db;
}
