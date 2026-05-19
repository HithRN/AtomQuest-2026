import { useEffect, useState } from "react";
import type { SharedGoalCreateInput, UomType, User } from "../types";

const UOM_OPTIONS: UomType[] = ["NUMERIC", "PERCENT", "TIMELINE", "ZERO_BASED"];

interface SharedGoalComposerProps {
  employees: User[];
  title: string;
  subtitle: string;
  onCreate: (input: SharedGoalCreateInput) => Promise<void> | void;
}

export function SharedGoalComposer(props: SharedGoalComposerProps) {
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [primaryOwnerId, setPrimaryOwnerId] = useState<string>("");
  const [form, setForm] = useState({
    thrustArea: "",
    title: "",
    description: "",
    uomType: "PERCENT" as UomType,
    targetValue: "",
    defaultWeightage: 20,
  });

  const selectedEmployees = props.employees.filter((employee) => recipientIds.includes(employee.id));

  useEffect(() => {
    if (selectedEmployees.length === 0) {
      setPrimaryOwnerId("");
      return;
    }

    if (!selectedEmployees.some((employee) => employee.id === primaryOwnerId)) {
      setPrimaryOwnerId(selectedEmployees[0].id);
    }
  }, [primaryOwnerId, selectedEmployees]);

  function toggleRecipient(recipientId: string) {
    setRecipientIds((current) =>
      current.includes(recipientId)
        ? current.filter((id) => id !== recipientId)
        : [...current, recipientId],
    );
  }

  async function handleSubmit() {
    await props.onCreate({
      ...form,
      primaryOwnerId,
      recipientIds,
    });

    setRecipientIds([]);
    setPrimaryOwnerId("");
    setForm({
      thrustArea: "",
      title: "",
      description: "",
      uomType: "PERCENT",
      targetValue: "",
      defaultWeightage: 20,
    });
  }

  return (
    <section className="composer-card">
      <h3>{props.title}</h3>
      <p>{props.subtitle}</p>

      <div className="field-grid">
        <label className="field-group">
          <span className="field-label">Thrust area</span>
          <input
            value={form.thrustArea}
            onChange={(event) => setForm((current) => ({ ...current, thrustArea: event.target.value }))}
          />
        </label>

        <label className="field-group">
          <span className="field-label">UoM</span>
          <select
            value={form.uomType}
            onChange={(event) =>
              setForm((current) => ({ ...current, uomType: event.target.value as UomType }))
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
          <span className="field-label">Shared KPI title</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </label>

        <label className="field-group full-width">
          <span className="field-label">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <label className="field-group">
          <span className="field-label">Target</span>
          <input
            value={form.targetValue}
            onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))}
          />
        </label>

        <label className="field-group">
          <span className="field-label">Default weightage</span>
          <input
            type="number"
            min={10}
            max={100}
            step={0.5}
            value={form.defaultWeightage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                defaultWeightage: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className="field-group">
        <span className="field-label">Recipients</span>
        <div className="recipient-grid">
          {props.employees.map((employee) => (
            <label className="recipient-pill" key={employee.id}>
              <input
                type="checkbox"
                checked={recipientIds.includes(employee.id)}
                onChange={() => toggleRecipient(employee.id)}
              />
              <span>
                <strong>{employee.name}</strong>
                <span className="log-meta">{employee.email}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="field-group">
        <span className="field-label">Primary owner</span>
        <select value={primaryOwnerId} onChange={(event) => setPrimaryOwnerId(event.target.value)}>
          <option value="">Select from checked recipients</option>
          {selectedEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>

      <div className="card-actions">
        <button className="button" type="button" onClick={handleSubmit}>
          Push shared KPI
        </button>
        <span className="log-meta">
          Submitted sheets will move back to rework so employees can rebalance to 100%.
        </span>
      </div>
    </section>
  );
}
