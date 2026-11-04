/* Compatibility bridge: these are the original controls and the existing
   character-sheet logic. React never changes the save format or game rules. */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;
export const names = [
  "Личность",
  "Знамение",
  "Характеристики",
  "Призвание",
  "Изученный навык",
  "Детали умений",
];
export interface WizardState {
  step: number;
  complete: boolean[];
  name: string;
  omen: string;
  vocation: string;
}
export function readWizard(): WizardState {
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>(".portal-step-button"),
  ];
  const active = buttons.findIndex((b) => b.classList.contains("active"));
  return {
    step: Math.max(0, active),
    complete: buttons.slice(0, 6).map((b) => b.dataset.complete === "true"),
    name: $("desk-preview-name")?.textContent || "Новая история",
    omen: $("desk-preview-omen")?.textContent || "Знамение ещё не выбрано",
    vocation:
      $("desk-preview-vocation")?.textContent || "Призвание ещё не выбрано",
  };
}
export function clickStep(n: number) {
  document
    .querySelectorAll<HTMLButtonElement>(".portal-step-button")
    [n]?.click();
}
export function clickControl(id: string) {
  $<HTMLButtonElement>(id)?.click();
}
export function setLegacyInput(id: string, value: string) {
  const input = $<HTMLInputElement | HTMLTextAreaElement>(id);
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
export function inputValue(id: string) {
  return $<HTMLInputElement | HTMLTextAreaElement>(id)?.value || "";
}
export function hideAfterMount(node: HTMLElement | null) {
  if (!node) return () => {};
  const previous = node.style.display;
  node.style.display = "none";
  return () => {
    node.style.display = previous;
  };
}
