import { useMemo, useState } from "react";
import { GoalCard } from "./GoalCard";
import { SharedGoalComposer } from "./SharedGoalComposer";
import type {
  GoalPatchInput,
  GoalSheetDetail,
  GoalSheetSummary,
  SharedGoalCreateInput,
  User,
} from "../types";

interface ManagerWorkspaceProps {
  user: User;
  teamSheets: GoalSheetSummary[];
  teamEmployees: User[];
  selectedSheetId: string;
  selectedSheet: GoalSheetDetail | null;
  onSelectSheet: (sheetId: string) => void;
  onUpdateGoal: (goalId: string, patch: GoalPatchInput) => Promise<void> | void;
  onApprove: (sheetId: string) => Promise<void> | void;
  onReturn: (sheetId: string, comment: string) => Promise<void> | void;
  onCreateSharedGoal: (input: SharedGoalCreateInput) => Promise<void> | void;
}

export function ManagerWorkspace(props: ManagerWorkspaceProps) {
  const [comment, setComment] = useState("");
  const pendingCount = useMemo(
    () => props.teamSheets.filter((sheet) => sheet.status === "SUBMITTED").length,
    [props.teamSheets],
  );
  const editable = props.selectedSheet?.sheet.status === "SUBMITTED";

  return (
    <div className="workspace-stack">
      <div className="summary-grid">
        <SummaryTile label="Pending approvals" value={String(pendingCount)} description="Submitted goal sheets waiting for L1 review." />
        <SummaryTile label="Team size" value={String(props.teamEmployees.length)} description="Employees mapped to this manager in the seed data." />
        <SummaryTile label="Shared KPI rights" value="Enabled" description="Managers can push departmental KPIs to their own team." />
        <SummaryTile label="Approval mode" value="Inline edits" description="Targets and weightage can be adjusted during review." />
      </div>

      <SharedGoalComposer
        employees={props.teamEmployees}
        title="Push a shared departmental KPI"
        subtitle="This is the shared-goal workflow from Phase 1. Employees can only change weightage after the KPI is assigned."
        onCreate={props.onCreateSharedGoal}
      />

      <div className="queue-list">
        <section className="queue-card">
          <div className="queue-head">
            <div>
              <span className="meta-label">Manager queue</span>
              <h4>{props.user.name}'s team sheets</h4>
            </div>
            <span className="badge subtle">{props.teamSheets.length} total</span>
          </div>
          <p>Choose a sheet to review, edit inline, approve, or return for rework.</p>

          <div className="role-buttons" style={{ marginTop: "1rem" }}>
            {props.teamSheets.map((sheet) => (
              <button
                key={sheet.id}
                className={props.selectedSheetId === sheet.id ? "active" : ""}
                type="button"
                onClick={() => props.onSelectSheet(sheet.id)}
              >
                <strong>{sheet.employee.name}</strong>
                <span className="queue-stamp">
                  {formatStatus(sheet.status)} · {sheet.goalCount} goals · {sheet.totalWeightage}%
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-section">
          {props.selectedSheet ? (
            <div className="workspace-stack">
              <div className="workspace-actions">
                <div className="section-heading">
                  <h2>{props.selectedSheet.employee.name}'s submission</h2>
                  <p>
                    Review the sheet against the brief, adjust targets or weightages inline, then
                    approve or return it.
                  </p>
                </div>
                <span className="badge">{formatStatus(props.selectedSheet.sheet.status)}</span>
              </div>

              <div className="validation-list">
                <ValidationItem
                  passed={props.selectedSheet.validation.totalWeightageRuleSatisfied}
                  text={`Total weightage: ${props.selectedSheet.validation.totalWeightage}%`}
                />
                <ValidationItem
                  passed={props.selectedSheet.validation.minimumWeightageRuleSatisfied}
                  text="Every goal carries at least 10% weightage."
                />
                <ValidationItem
                  passed={props.selectedSheet.validation.maxGoalsRuleSatisfied}
                  text="Goal count is within the 8-goal cap."
                />
              </div>

              {props.selectedSheet.sheet.returnComment ? (
                <div className="empty-state">{props.selectedSheet.sheet.returnComment}</div>
              ) : null}

              <div className="goal-list">
                {props.selectedSheet.goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    mode={editable ? "manager" : "readonly"}
                    onSave={props.onUpdateGoal}
                  />
                ))}
              </div>

              <div className="workspace-section">
                <div className="section-heading">
                  <h2>Decision</h2>
                  <p>Approvals lock the sheet. Returning it sends the employee back into rework.</p>
                </div>
                <div className="field-group">
                  <span className="field-label">Return comment</span>
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
                </div>
                <div className="card-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={!editable}
                    onClick={() => props.onApprove(props.selectedSheet!.sheet.id)}
                  >
                    Approve and lock
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!editable || comment.trim().length < 3}
                    onClick={() => props.onReturn(props.selectedSheet!.sheet.id, comment)}
                  >
                    Return for rework
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a team member’s goal sheet from the queue.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function ValidationItem(props: { passed: boolean; text: string }) {
  return (
    <div className="validation-item">
      <span className={props.passed ? "validation-icon pass" : "validation-icon fail"}>
        {props.passed ? "OK" : "!"}
      </span>
      <div>{props.text}</div>
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
