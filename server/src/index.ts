import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { API_PORT } from "./constants";
import { initializeDatabase } from "./db";
import {
  AppError,
  addGoalToMySheet,
  approveGoalSheet,
  createSharedGoal,
  deleteGoal,
  getAdminOverview,
  getBootstrapData,
  getGoalSheet,
  getManagerTeamSheets,
  getMyGoalSheet,
  getUserById,
  returnGoalSheetForRework,
  submitMyGoalSheet,
  unlockGoalSheet,
  updateGoal,
} from "./service";
import {
  createGoalSchema,
  returnSheetSchema,
  sharedGoalSchema,
  unlockSheetSchema,
  updateGoalSchema,
} from "./validation";

declare global {
  namespace Express {
    interface Request {
      user?: ReturnType<typeof getUserById>;
    }
  }
}

initializeDatabase();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/bootstrap", (_req, res) => {
  res.json(getBootstrapData());
});

app.use("/api", (req, res, next) => {
  if (req.path === "/bootstrap" || req.path === "/health") {
    next();
    return;
  }

  const userId = req.header("x-demo-user");

  if (!userId) {
    next(new AppError(401, "Missing x-demo-user header."));
    return;
  }

  req.user = getUserById(userId);
  next();
});

app.get("/api/my/goal-sheet", (req, res) => {
  res.json(getMyGoalSheet(req.user!));
});

app.post("/api/my/goals", (req, res) => {
  const payload = createGoalSchema.parse(req.body);
  res.status(201).json(addGoalToMySheet(req.user!, payload));
});

app.patch("/api/goals/:goalId", (req, res) => {
  const payload = updateGoalSchema.parse(req.body);
  res.json(updateGoal(req.user!, req.params.goalId, payload));
});

app.delete("/api/goals/:goalId", (req, res) => {
  res.json(deleteGoal(req.user!, req.params.goalId));
});

app.post("/api/my/submit", (req, res) => {
  res.json(submitMyGoalSheet(req.user!));
});

app.get("/api/manager/team-sheets", (req, res) => {
  res.json(getManagerTeamSheets(req.user!));
});

app.get("/api/goal-sheets/:sheetId", (req, res) => {
  res.json(getGoalSheet(req.user!, req.params.sheetId));
});

app.post("/api/manager/goal-sheets/:sheetId/approve", (req, res) => {
  res.json(approveGoalSheet(req.user!, req.params.sheetId));
});

app.post("/api/manager/goal-sheets/:sheetId/return", (req, res) => {
  const payload = returnSheetSchema.parse(req.body);
  res.json(returnGoalSheetForRework(req.user!, req.params.sheetId, payload.comment));
});

app.get("/api/admin/overview", (req, res) => {
  res.json(getAdminOverview(req.user!));
});

app.post("/api/admin/goal-sheets/:sheetId/unlock", (req, res) => {
  const payload = unlockSheetSchema.parse(req.body);
  res.json(unlockGoalSheet(req.user!, req.params.sheetId, payload.reason));
});

app.post("/api/admin/shared-goals", (req, res) => {
  const payload = sharedGoalSchema.parse(req.body);
  res.status(201).json(createSharedGoal(req.user!, payload));
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(422).json({
      message: "Validation failed.",
      issues: error.issues,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Unexpected server error.",
  });
});

app.listen(API_PORT, () => {
  console.log(`AtomQuest Goal Portal API listening on http://localhost:${API_PORT}`);
});
