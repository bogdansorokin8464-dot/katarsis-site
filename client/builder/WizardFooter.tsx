import { useLayoutEffect } from "react";
import { clickControl, hideAfterMount } from "./legacy";
import { useWizard } from "./useWizard";
export function WizardFooter({ legacyFooter }: { legacyFooter: HTMLElement }) {
  const wizard = useWizard();
  useLayoutEffect(() => hideAfterMount(legacyFooter), [legacyFooter]);
  return (
    <>
      <button
        type="button"
        className="portal-button"
        disabled={wizard.step === 0}
        onClick={() => clickControl("portal-step-back")}
      >
        ← Назад
      </button>
      <small aria-live="polite">Шаг {wizard.step + 1} из 6</small>
      <button
        type="button"
        className="portal-button primary"
        onClick={() => clickControl("portal-step-next")}
      >
        {wizard.step === 5 ? "Выбрать снаряжение →" : "Далее →"}
      </button>
    </>
  );
}
