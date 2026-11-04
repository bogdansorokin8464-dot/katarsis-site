import { useEffect, useState } from "react";
import { readWizard, $, type WizardState } from "./legacy";
export function useWizard(): WizardState {
  const [state, setState] = useState(readWizard);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(
      ".portal-wizard-nav:not(.react-wizard-nav)",
    );
    if (!nav) return;
    const refresh = () => setState(readWizard());
    const observer = new MutationObserver(refresh);
    observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-complete", "aria-label"],
      childList: true,
      characterData: true,
    });
    document.addEventListener("katarsis:active-character", refresh);
    refresh();
    return () => {
      observer.disconnect();
      document.removeEventListener("katarsis:active-character", refresh);
    };
  }, []);
  return state;
}
