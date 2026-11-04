import { createRoot } from "react-dom/client";
import { Identity } from "./Identity";
import { WizardNav } from "./WizardNav";
import { WizardFooter } from "./WizardFooter";
/* The legacy controls remain in the DOM. They are hidden only after React
   successfully mounts, so the original builder remains usable on failure. */
export function installBuilder() {
  const nav = document.querySelector<HTMLElement>(
    "#view-builder .portal-wizard-nav",
  );
  const footer = document.querySelector<HTMLElement>(
    "#view-builder .portal-wizard-bottom",
  );
  const identity = document.querySelector<HTMLElement>(
    "#portal-step-0 .portal-identity",
  );
  if (!nav || !footer || !identity) return;
  const navRoot = document.createElement("nav");
  navRoot.className = "portal-wizard-nav react-wizard-nav";
  navRoot.setAttribute("aria-label", "Шаги создания");
  nav.before(navRoot);
  const identityRoot = document.createElement("div");
  identityRoot.className = "portal-identity react-builder-identity";
  identity.before(identityRoot);
  const footerRoot = document.createElement("div");
  footerRoot.className = "portal-wizard-bottom react-wizard-bottom";
  footer.before(footerRoot);
  createRoot(navRoot).render(<WizardNav legacyNav={nav} />);
  createRoot(identityRoot).render(<Identity legacyIdentity={identity} />);
  createRoot(footerRoot).render(<WizardFooter legacyFooter={footer} />);
}
