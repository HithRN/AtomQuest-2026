import { useEffect, useState } from "react";
import { GoalCard } from "./GoalCard";
import type { GoalFormInput, GoalPatchInput, GoalSheetDetail, UomType, User } from "../types";

interface EmployeeWorkspaceProps {
  user: User;
  sheet: GoalSheetDetail | null;
  uomGuide: Array<{
    type: UomType;
    description: string;
    formulaHint: string;
  }>;
  onAddGoal: (input: GoalFormInput) => Promise<void> | void;
  onUpdateGoal: (goalId: string, patch: GoalPatchInput) => Promise<void> | void;
  onDeleteGoal: (goalId: string) => Promise<void> | void;
  onSubmit: () => Promise<void> | void;
}

const EMPTY_FORM: GoalFormInput = {
  thrustArea: "",
  title: "",
  description: "",
  uomType: "NUMERIC",
  targetValue: "",
  weightage: 10,
};

export function EmployeeWorkspace(props: EmployeeWorkspaceProps) {
  const [form, setForm] = useState<GoalFormInput>(EMPTY_FORM);

  useEffect(() => {
    setForm(EMPTY_FORM);
  }, [props.sheet?.sheet.updatedAt]);

  const editable =
    props.sheet && (props.sheet.sheet.status === "DRAFT" || props.sheet.sheet.status === "NEEDS_REWORK");

  return (
    <div className="workspace-stack">
      <div className="summary-grid">
        <SummaryTile label="Sheet status" value={formatStatus(props.sheet?.sheet.status)} description="Employees can draft, resubmit, or review the final lock state." />
        <SummaryTile
          label="Total weightage"
          value={`${props.sheet?.validation.totalWeightage ?? 0}%`}
          description="Must equal exactly 100% before submission."
        />
        <SummaryTile
          label="Goal count"
          value={String(props.sheet?.validation.goalCount ?? 0)}
          description="The brief caps each employee at 8 goals."
        />
        <SummaryTile
          label="Manager"
          value={props.sheet?.manager.name ?? "-"}
          description="L1 approval is required before the sheet is locked."
        />
      </div>

      {props.sheet?.sheet.returnComment ? (
        <section className="workspace-section">
          <div className="section-heading">
            <h2>Rework note</h2>
            <p>{props.sheet.sheet.returnComment}</p>
          </div>
        </section>
      ) : null}

      <div className="split-layout">
        <section className="workspace-section">
          <div className="section-heading">
            <h2>Validation guardrails</h2>
            <p>These are the exact Phase 1 rules enforced when an employee submits a goal sheet.</p>
          </div>
          <div className="validation-list">
            <ValidationItem
              passed={Boolean(props.sheet?.validation.totalWeightageRuleSatisfied)}
              text={`Total weightage must equal 100%. Current total: ${props.sheet?.validation.totalWeightage ?? 0}%.`}
            />
            <ValidationItem
              passed={Boolean(props.sheet?.validation.minimumWeightageRuleSatisfied)}
              text="Every goal needs at least 10% weightage."
            />
            <ValidationItem
              passed={Boolean(props.sheet?.validation.maxGoalsRuleSatisfied)}
              text="An employee can have no more than 8 goals."
            />
            <ValidationItem
              passed={Boolean(props.sheet?.validation.requiredFieldsSatisfied)}
              text="Every goal must include thrust area, title, description, UoM, target, and weightage."
            />
          </div>
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <h2>Add a goal</h2>
            <p>
              {editable
                ? "Draft new goals here. Shared goals already on the sheet will stay locked except for weightage."
                : "This sheet is currently locked. Switch to a draft or rework state to add new goals."}
            </p>
          </div>

          <div className="field-grid">
            <label className="field-group">
              <span className="field-label">Thrust area</span>
              <input
                disabled={!editable}
                value={form.thrustArea}
                onChange={(event) => setForm((current) => ({ ...current, thrustArea: event.target.value }))}
              />
            </label>

            <label className="field-group">
              <span className="field-label">UoM</span>
              <select
                disabled={!editable}
                value={form.uomType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, uomType: event.target.value as UomType }))
                }
              >
                {props.uomGuide.map((guide) => (
                  <option key={guide.type} value={guide.type}>
                    {guide.type}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group full-width">
              <span className="field-label">Goal title</span>
              <input
                disabled={!editable}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label className="field-group full-width">
              <span className="field-label">Description</span>
              <textarea
                disabled={!editable}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <label className="field-group">
              <span className="field-label">Target</span>
              <input
                disabled={!editable}
                value={form.targetValue}
                onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))}
              />
            </label>

            <label className="field-group">
              <span className="field-label">Weightage (%)</span>
              <input
                type="number"
                min={10}
                max={100}
                step={0.5}
                disabled={!editable}
                value={form.weightage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weightage: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>

          <div className="card-actions">
            <button
              className="button"
              type="button"
              disabled={!editable}
              onClick={() => props.onAddGoal(form)}
            >
              Add goal to sheet
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!editable || !props.sheet?.validation.isSubmittable}
              onClick={() => props.onSubmit()}
            >
              Submit for approval
            </button>
          </div>
        </section>
      </div>

      <section className="workspace-section">
        <div className="workspace-actions">
          <div className="section-heading">
            <h2>{props.user.name}'s goal sheet</h2>
            <p>
              Personal goals remain fully editable until submission. Shared KPIs allow weightage changes only.
            </p>
          </div>
          <span className="badge subtle">{props.sheet?.goals.length ?? 0} active goals</span>
        </div>
        <div className="goal-list">
          {props.sheet?.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              mode={editable ? "employee" : "readonly"}
              onSave={props.onUpdateGoal}
              onDelete={props.onDeleteGoal}
            />
          ))}
          {props.sheet?.goals.length === 0 ? (
            <div className="empty-state">No goals added yet. Start by creating the first draft goal above.</div>
          ) : null}
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <h2>UoM guidance from the brief</h2>
          <p>The table below comes directly from the problem statement’s measurement section.</p>
        </div>
        <div className="surface-grid">
          {props.uomGuide.map((guide) => (
            <div className="surface-card" key={guide.type}>
              <span className="meta-label">{guide.type}</span>
              <h3>{guide.description}</h3>
              <p>{guide.formulaHint}</p>
            </div>
          ))}
        </div>
      </section>
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

function formatStatus(status?: string) {
  return status ? status.replaceAll("_", " ") : "-";
}
