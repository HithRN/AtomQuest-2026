import { useEffect, useState } from "react";
import type { Goal, GoalPatchInput, UomType } from "../types";

const UOM_OPTIONS: UomType[] = ["NUMERIC", "PERCENT", "TIMELINE", "ZERO_BASED"];

interface GoalCardProps {
  goal: Goal;
  mode: "employee" | "manager" | "readonly";
  onSave?: (goalId: string, patch: GoalPatchInput) => Promise<void> | void;
  onDelete?: (goalId: string) => Promise<void> | void;
}

export function GoalCard(props: GoalCardProps) {
  const [draft, setDraft] = useState({
    thrustArea: props.goal.thrustArea,
    title: props.goal.title,
    description: props.goal.description,
    uomType: props.goal.uomType,
    targetValue: props.goal.targetValue,
    weightage: String(props.goal.weightage),
  });

  useEffect(() => {
    setDraft({
      thrustArea: props.goal.thrustArea,
      title: props.goal.title,
      description: props.goal.description,
      uomType: props.goal.uomType,
      targetValue: props.goal.targetValue,
      weightage: String(props.goal.weightage),
    });
  }, [props.goal]);

  const employeeCanEditAll = props.mode === "employee" && !props.goal.sharedLocked;
  const employeeCanEditWeightage = props.mode === "employee";
  const managerCanEditTarget = props.mode === "manager" && !props.goal.sharedLocked;
  const managerCanEditWeightage = props.mode === "manager";

  function buildPatch(): GoalPatchInput {
    if (props.mode === "manager") {
      return props.goal.sharedLocked
        ? {
            weightage: Number(draft.weightage),
          }
        : {
            targetValue: draft.targetValue,
            weightage: Number(draft.weightage),
          };
    }

    return props.goal.sharedLocked
      ? {
          weightage: Number(draft.weightage),
        }
      : {
          thrustArea: draft.thrustArea,
          title: draft.title,
          description: draft.description,
          uomType: draft.uomType,
          targetValue: draft.targetValue,
          weightage: Number(draft.weightage),
        };
  }

  return (
    <article className="goal-card">
      <div className="goal-head">
        <div>
          <span className="meta-label">Goal #{props.goal.sortOrder}</span>
          <h4>{props.goal.title}</h4>
        </div>
        <div className="action-row">
          {props.goal.sharedLocked ? <span className="badge">Shared KPI</span> : null}
          {props.goal.primaryOwnerId ? <span className="badge subtle">Primary owner linked</span> : null}
        </div>
      </div>

      <div className="field-grid">
        <label className="field-group">
          <span className="field-label">Thrust area</span>
          <input
            value={draft.thrustArea}
            readOnly={!employeeCanEditAll}
            onChange={(event) => setDraft((current) => ({ ...current, thrustArea: event.target.value }))}
          />
        </label>

        <label className="field-group">
          <span className="field-label">UoM</span>
          <select
            value={draft.uomType}
            disabled={!employeeCanEditAll}
            onChange={(event) =>
              setDraft((current) => ({ ...current, uomType: event.target.value as UomType }))
            }
          >
            {UOM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group full-width">
          <span className="field-label">Goal title</span>
          <input
            value={draft.title}
            readOnly={!employeeCanEditAll}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </label>

        <label className="field-group full-width">
          <span className="field-label">Description</span>
          <textarea
            value={draft.description}
            readOnly={!employeeCanEditAll}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <label className="field-group">
          <span className="field-label">Target</span>
          <input
            value={draft.targetValue}
            readOnly={!(employeeCanEditAll || managerCanEditTarget)}
            onChange={(event) => setDraft((current) => ({ ...current, targetValue: event.target.value }))}
          />
        </label>

        <label className="field-group">
          <span className="field-label">Weightage (%)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={draft.weightage}
            readOnly={!(employeeCanEditWeightage || managerCanEditWeightage)}
            onChange={(event) => setDraft((current) => ({ ...current, weightage: event.target.value }))}
          />
        </label>
      </div>

      <div className="meta-grid">
        <div>
          <span className="meta-label">Goal type</span>
          <div className="goal-metadata">{props.goal.sharedLocked ? "Shared departmental KPI" : "Employee-owned goal"}</div>
        </div>
        <div>
          <span className="meta-label">Last updated</span>
          <div className="goal-metadata">{new Date(props.goal.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      {props.mode !== "readonly" ? (
        <div className="card-actions">
          <button className="secondary-button" type="button" onClick={() => props.onSave?.(props.goal.id, buildPatch())}>
            Save changes
          </button>
          {props.mode === "employee" && !props.goal.sharedLocked ? (
            <button className="danger-button" type="button" onClick={() => props.onDelete?.(props.goal.id)}>
              Delete goal
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
