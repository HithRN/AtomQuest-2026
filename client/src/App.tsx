import { startTransition, useEffect, useState } from "react";
import { api, ApiClientError } from "./api";
import { AdminWorkspace } from "./components/AdminWorkspace";
import { EmployeeWorkspace } from "./components/EmployeeWorkspace";
import { ManagerWorkspace } from "./components/ManagerWorkspace";
import type {
  AdminOverview,
  BootstrapResponse,
  GoalFormInput,
  GoalPatchInput,
  GoalSheetDetail,
  GoalSheetSummary,
  SharedGoalCreateInput,
  User,
} from "./types";

function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [employeeSheet, setEmployeeSheet] = useState<GoalSheetDetail | null>(null);
  const [managerSheets, setManagerSheets] = useState<GoalSheetSummary[]>([]);
  const [managerSelectedSheetId, setManagerSelectedSheetId] = useState<string>("");
  const [managerSheetDetail, setManagerSheetDetail] = useState<GoalSheetDetail | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      setLoading(true);
      try {
        const response = await api.getBootstrap();
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setBootstrap(response);
          const defaultUser =
            response.users.find((user) => user.role === "EMPLOYEE") ?? response.users[0];
          setActiveUserId(defaultUser?.id ?? "");
        });
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeUser = bootstrap?.users.find((user) => user.id === activeUserId) ?? null;

  useEffect(() => {
    if (!activeUser) {
      return;
    }

    const currentUser = activeUser;
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadRoleData() {
      try {
        if (currentUser.role === "EMPLOYEE") {
          const sheet = await api.getMyGoalSheet(currentUser.id);
          if (cancelled) {
            return;
          }

          startTransition(() => {
            setEmployeeSheet(sheet);
            setManagerSheets([]);
            setManagerSheetDetail(null);
            setAdminOverview(null);
          });
          return;
        }

        if (currentUser.role === "MANAGER") {
          const sheets = await api.getManagerTeamSheets(currentUser.id);
          if (cancelled) {
            return;
          }

          const preferredSheet =
            sheets.find((sheet) => sheet.status === "SUBMITTED") ??
            sheets.find((sheet) => sheet.id === managerSelectedSheetId) ??
            sheets[0];

          startTransition(() => {
            setManagerSheets(sheets);
            setManagerSelectedSheetId(preferredSheet?.id ?? "");
            setEmployeeSheet(null);
            setAdminOverview(null);
          });
          return;
        }

        const overview = await api.getAdminOverview(currentUser.id);
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setAdminOverview(overview);
          setEmployeeSheet(null);
          setManagerSheets([]);
          setManagerSheetDetail(null);
        });
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRoleData();

    return () => {
      cancelled = true;
    };
  }, [activeUser, refreshNonce]);

  useEffect(() => {
    if (!activeUser || activeUser.role !== "MANAGER" || !managerSelectedSheetId) {
      return;
    }

    const currentUser = activeUser;
    let cancelled = false;

    async function loadSelectedSheet() {
      try {
        const detail = await api.getGoalSheet(currentUser.id, managerSelectedSheetId);
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setManagerSheetDetail(detail);
        });
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      }
    }

    void loadSelectedSheet();

    return () => {
      cancelled = true;
    };
  }, [activeUser, managerSelectedSheetId, refreshNonce]);

  const employeeUsers = bootstrap?.users.filter((user) => user.role === "EMPLOYEE") ?? [];
  const managerUsers = bootstrap?.users.filter((user) => user.role === "MANAGER") ?? [];
  const adminUsers = bootstrap?.users.filter((user) => user.role === "ADMIN") ?? [];
  const managerTeamEmployees = employeeUsers.filter((user) => user.managerId === (activeUser?.id ?? ""));

  async function runAction<T>(action: () => Promise<T>, successMessage: string) {
    setError("");
    try {
      const result = await action();
      setNotice(successMessage);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    }
  }

  async function handleAddGoal(input: GoalFormInput) {
    if (!activeUser) {
      return;
    }

    const nextSheet = await runAction(
      () => api.addGoal(activeUser.id, input),
      "Goal added to the draft sheet.",
    );

    startTransition(() => {
      setEmployeeSheet(nextSheet);
    });
  }

  async function handleUpdateGoal(goalId: string, input: GoalPatchInput) {
    if (!activeUser) {
      return;
    }

    const nextSheet = await runAction(
      () => api.updateGoal(activeUser.id, goalId, input),
      "Goal updated.",
    );

    if (activeUser.role === "EMPLOYEE") {
      startTransition(() => {
        setEmployeeSheet(nextSheet);
      });
      return;
    }

    if (activeUser.role === "MANAGER") {
      startTransition(() => {
        setManagerSheetDetail(nextSheet);
        setRefreshNonce((value) => value + 1);
      });
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!activeUser) {
      return;
    }

    if (!window.confirm("Delete this goal from the draft sheet?")) {
      return;
    }

    const nextSheet = await runAction(
      () => api.deleteGoal(activeUser.id, goalId),
      "Goal removed from the draft sheet.",
    );

    startTransition(() => {
      setEmployeeSheet(nextSheet);
    });
  }

  async function handleSubmitSheet() {
    if (!activeUser) {
      return;
    }

    const nextSheet = await runAction(
      () => api.submitMyGoalSheet(activeUser.id),
      "Goal sheet submitted for manager approval.",
    );

    startTransition(() => {
      setEmployeeSheet(nextSheet);
    });
  }

  async function handleApproveSheet(sheetId: string) {
    if (!activeUser) {
      return;
    }

    const nextSheet = await runAction(
      () => api.approveGoalSheet(activeUser.id, sheetId),
      "Goal sheet approved and locked.",
    );

    startTransition(() => {
      setManagerSheetDetail(nextSheet);
      setRefreshNonce((value) => value + 1);
    });
  }

  async function handleReturnSheet(sheetId: string, comment: string) {
    if (!activeUser) {
      return;
    }

    const nextSheet = await runAction(
      () => api.returnGoalSheet(activeUser.id, sheetId, comment),
      "Goal sheet returned for rework.",
    );

    startTransition(() => {
      setManagerSheetDetail(nextSheet);
      setRefreshNonce((value) => value + 1);
    });
  }

  async function handleUnlockSheet(sheetId: string, reason: string) {
    if (!activeUser) {
      return;
    }

    await runAction(
      () => api.unlockGoalSheet(activeUser.id, sheetId, reason),
      "Approved sheet unlocked and moved to rework.",
    );

    startTransition(() => {
      setRefreshNonce((value) => value + 1);
    });
  }

  async function handleCreateSharedGoal(input: SharedGoalCreateInput) {
    if (!activeUser) {
      return;
    }

    await runAction(
      () => api.createSharedGoal(activeUser.id, input),
      "Shared KPI assigned to the selected employees.",
    );

    startTransition(() => {
      setRefreshNonce((value) => value + 1);
    });
  }

  return (
    <div className="app-shell">
      <header className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">AtomQuest Hackathon 1.0</p>
          <h1>Goal Setting & Tracking Portal</h1>
          <p className="hero-summary">
            Phase 1 from the brief is implemented here as a role-based portal with seeded employee,
            manager, and admin journeys, hard validation rules, shared KPIs, approvals, locks, and
            audit-ready actions.
          </p>
          {bootstrap ? (
            <div className="hero-metrics">
              <div className="metric-chip">
                <span className="metric-label">Cycle</span>
                <strong>{bootstrap.currentCycle.name}</strong>
              </div>
              <div className="metric-chip">
                <span className="metric-label">Window</span>
                <strong>
                  {bootstrap.currentCycle.phaseWindowStart} to {bootstrap.currentCycle.phaseWindowEnd}
                </strong>
              </div>
              <div className="metric-chip">
                <span className="metric-label">Active phase</span>
                <strong>{bootstrap.currentCycle.phaseLabel}</strong>
              </div>
            </div>
          ) : null}
        </div>
        <div className="brief-card">
          <h2>What the brief expects</h2>
          <ul className="brief-list">
            {bootstrap?.brief.phaseOne.mustHaves.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </header>

      <div className="main-grid">
        <aside className="sidebar-panel">
          <section className="sidebar-section">
            <div className="section-heading">
              <h2>Demo roles</h2>
              <p>Switch users to rehearse each required journey from the problem statement.</p>
            </div>
            <RoleGroup
              label="Employee"
              users={employeeUsers}
              activeUserId={activeUserId}
              onSelect={setActiveUserId}
            />
            <RoleGroup
              label="Manager"
              users={managerUsers}
              activeUserId={activeUserId}
              onSelect={setActiveUserId}
            />
            <RoleGroup
              label="Admin"
              users={adminUsers}
              activeUserId={activeUserId}
              onSelect={setActiveUserId}
            />
          </section>

          <section className="sidebar-section">
            <div className="section-heading">
              <h2>Phase 2 preview</h2>
              <p>The document also defines quarterly check-ins, which this codebase is prepared to grow into.</p>
            </div>
            <div className="timeline-stack">
              {bootstrap?.brief.phaseTwoPreview.checkInSchedule.map((entry) => (
                <div className="timeline-item" key={entry.period}>
                  <span className="timeline-window">{entry.opens}</span>
                  <div>
                    <strong>{entry.period}</strong>
                    <p>{entry.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sidebar-section">
            <div className="section-heading">
              <h2>Implementation notes</h2>
              <p>These are the assumptions used where the brief leaves room for interpretation.</p>
            </div>
            <ul className="brief-list compact">
              {bootstrap?.brief.phaseOne.assumptions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </aside>

        <main className="workspace-panel">
          <div className="workspace-header">
            <div>
              <p className="eyebrow">Active persona</p>
              <h2>{activeUser?.name ?? "Loading..."}</h2>
              <p className="workspace-subtitle">
                {activeUser ? `${activeUser.role} · ${activeUser.email}` : "Preparing the seeded workspace"}
              </p>
            </div>
            <div className="status-pills">
              <span className="pill">Phase 1 complete flow</span>
              <span className="pill subtle">SQLite seed data</span>
              <span className="pill subtle">Audit trail enabled</span>
            </div>
          </div>

          {loading ? <div className="banner info">Syncing the latest portal state...</div> : null}
          {notice ? <div className="banner success">{notice}</div> : null}
          {error ? <div className="banner danger">{error}</div> : null}

          {activeUser?.role === "EMPLOYEE" ? (
            <EmployeeWorkspace
              user={activeUser}
              sheet={employeeSheet}
              uomGuide={bootstrap?.brief.phaseOne.uomGuide ?? []}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
              onSubmit={handleSubmitSheet}
            />
          ) : null}

          {activeUser?.role === "MANAGER" ? (
            <ManagerWorkspace
              user={activeUser}
              teamSheets={managerSheets}
              teamEmployees={managerTeamEmployees}
              selectedSheetId={managerSelectedSheetId}
              selectedSheet={managerSheetDetail}
              onSelectSheet={setManagerSelectedSheetId}
              onUpdateGoal={handleUpdateGoal}
              onApprove={handleApproveSheet}
              onReturn={handleReturnSheet}
              onCreateSharedGoal={handleCreateSharedGoal}
            />
          ) : null}

          {activeUser?.role === "ADMIN" ? (
            <AdminWorkspace
              employees={employeeUsers}
              overview={adminOverview}
              onUnlock={handleUnlockSheet}
              onCreateSharedGoal={handleCreateSharedGoal}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function RoleGroup(props: {
  label: string;
  users: User[];
  activeUserId: string;
  onSelect: (userId: string) => void;
}) {
  if (props.users.length === 0) {
    return null;
  }

  return (
    <div className="role-group">
      <h3>{props.label}</h3>
      <div className="role-buttons">
        {props.users.map((user) => (
          <button
            className={user.id === props.activeUserId ? "role-button active" : "role-button"}
            key={user.id}
            type="button"
            onClick={() => props.onSelect(user.id)}
          >
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (typeof error.details === "string" && error.details.trim()) {
      return `${error.message} ${error.details}`;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while updating the portal.";
}

export default App;
