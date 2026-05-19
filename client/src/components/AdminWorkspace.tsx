import { useState } from "react";
import { SharedGoalComposer } from "./SharedGoalComposer";
import type { AdminOverview, SharedGoalCreateInput, User } from "../types";

interface AdminWorkspaceProps {
  employees: User[];
  overview: AdminOverview | null;
  onUnlock: (sheetId: string, reason: string) => Promise<void> | void;
  onCreateSharedGoal: (input: SharedGoalCreateInput) => Promise<void> | void;
}

export function AdminWorkspace(props: AdminWorkspaceProps) {
  const [unlockReasons, setUnlockReasons] = useState<Record<string, string>>({});

  return (
    <div className="workspace-stack">
      <div className="summary-grid">
        <SummaryTile
          label="Locked sheets"
          value={String(props.overview?.sheets.filter((sheet) => sheet.status === "APPROVED_LOCKED").length ?? 0)}
          description="Admins can reopen these if business changes require edits."
        />
        <SummaryTile
          label="Shared KPIs"
          value={String(props.overview?.sharedGoals.length ?? 0)}
          description="Active departmental KPIs linked across employee sheets."
        />
        <SummaryTile
          label="Audit events"
          value={String(props.overview?.auditLogs.length ?? 0)}
          description="Recent actions captured for governance and traceability."
        />
        <SummaryTile label="Scope" value="Phase 1" description="Unlocks, shared KPIs, and cross-role visibility are live." />
      </div>

      <SharedGoalComposer
        employees={props.employees}
        title="Push a shared KPI across employees"
        subtitle="Admins can assign the same departmental KPI to multiple people without editing each sheet manually."
        onCreate={props.onCreateSharedGoal}
      />

      <section className="workspace-section">
        <div className="section-heading">
          <h2>Goal sheet governance</h2>
          <p>
            Approved sheets are intentionally locked. Use the unlock action only when a sheet needs
            controlled rework.
          </p>
        </div>
        <div className="shared-list">
          {props.overview?.sheets.map((sheet) => (
            <article className="shared-card" key={sheet.id}>
              <div className="shared-head">
                <div>
                  <span className="meta-label">{formatStatus(sheet.status)}</span>
                  <h3>{sheet.employee.name}</h3>
                </div>
                <span className="badge subtle">{sheet.totalWeightage}% total</span>
              </div>
              <p>
                {sheet.goalCount} goals · Updated {new Date(sheet.updatedAt).toLocaleString()}
              </p>
              {sheet.status === "APPROVED_LOCKED" ? (
                <>
                  <label className="field-group" style={{ marginTop: "0.9rem" }}>
                    <span className="field-label">Unlock reason</span>
                    <input
                      value={unlockReasons[sheet.id] ?? ""}
                      onChange={(event) =>
                        setUnlockReasons((current) => ({ ...current, [sheet.id]: event.target.value }))
                      }
                    />
                  </label>
                  <div className="card-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={(unlockReasons[sheet.id] ?? "").trim().length < 3}
                      onClick={() => props.onUnlock(sheet.id, unlockReasons[sheet.id] ?? "")}
                    >
                      Unlock sheet
                    </button>
                  </div>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <h2>Active shared KPIs</h2>
          <p>These departmental goals fan out to multiple employees while keeping the KPI definition locked.</p>
        </div>
        <div className="shared-list">
          {props.overview?.sharedGoals.map((goal) => (
            <article className="shared-card" key={goal.id}>
              <div className="shared-head">
                <div>
                  <span className="meta-label">{goal.thrustArea}</span>
                  <h3>{goal.title}</h3>
                </div>
                <span className="badge">{goal.recipientCount} recipients</span>
              </div>
              <p>Target: {goal.targetValue}</p>
              <p>Primary owner: {goal.ownerEmployeeName}</p>
              <p>Created by: {goal.createdByName}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <h2>Recent audit trail</h2>
          <p>The brief calls for audit-ready visibility, especially around locked-sheet changes.</p>
        </div>
        <div className="audit-list">
          {props.overview?.auditLogs.map((entry) => (
            <article className="audit-card" key={entry.id}>
              <span className="meta-label">{entry.action}</span>
              <h3>{entry.actorName}</h3>
              <p>
                {entry.employeeName ? `Employee: ${entry.employeeName}` : "Cross-sheet action"} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <pre className="log-meta">{JSON.stringify(entry.details, null, 2)}</pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryTile(props: { label: string; value: string; description: string }) {
  return (
    <div className="summary-tile">
      <span className="meta-label">{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.description}</p>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}
