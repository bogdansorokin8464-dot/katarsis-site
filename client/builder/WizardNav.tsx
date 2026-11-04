import { useLayoutEffect } from "react";
import { clickControl, clickStep, hideAfterMount, names } from "./legacy";
import { useWizard } from "./useWizard";
export function WizardNav({ legacyNav }: { legacyNav: HTMLElement }) {
  const wizard = useWizard();
  useLayoutEffect(() => hideAfterMount(legacyNav), [legacyNav]);
  return (
    <>
      {names.map((name, i) => (
        <button
          type="button"
          key={name}
          data-step={i}
          className={
            "react-wizard-step" +
            (wizard.step === i ? " active" : "") +
            (wizard.complete[i] ? " is-complete" : "")
          }
          aria-current={wizard.step === i ? "step" : undefined}
          aria-label={`Шаг ${i + 1}: ${name}${wizard.complete[i] ? " — готово" : ""}${wizard.step === i ? " — текущий шаг" : ""}`}
          onClick={() => clickStep(i)}
        >
          <span>{String(i + 1).padStart(2, "0")}</span>
          {name}
        </button>
      ))}
      <aside aria-label="Текущий персонаж" className="desk-character-preview">
        <span className="desk-preview-label">ТВОЙ ПЕРСОНАЖ</span>
        <strong>{wizard.name}</strong>
        <div className="desk-preview-details">
          <span>{wizard.omen}</span>
          <span>{wizard.vocation}</span>
        </div>
        <button
          type="button"
          className="portal-button"
          onClick={() => clickControl("desk-preview-sheet")}
        >
          Открыть лист ↗
        </button>
      </aside>
    </>
  );
}
