/* Small topbar and sidebar niceties around the original page. Nothing here
   changes game rules or the saved-data format. */
const SAVED_KEY = "katarsis.save.time";
const SAVED_TEXT = /^Сохранено(?: в этом браузере| в \d{1,2}:\d{2})/i;
function readSavedAt(): Date | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(+date) ? null : date;
  } catch {
    return null;
  }
}
function rememberSavedAt() {
  try {
    localStorage.setItem(SAVED_KEY, new Date().toISOString());
  } catch {}
}
function isSaved(text: string) {
  return SAVED_TEXT.test(text.trim());
}
function installSaveTime() {
  const state = document.getElementById("portal-save-state");
  if (!state) return;
  state.setAttribute("aria-live", "polite");
  let previous = state.textContent || "";
  let writing = false;
  const refresh = (forceNewTime = false) => {
    if (writing) return;
    const raw = (state.textContent || "").trim();
    if (!isSaved(raw)) {
      previous = raw;
      return;
    }
    if (forceNewTime || !isSaved(previous)) rememberSavedAt();
    previous = raw;
    let date = readSavedAt();
    if (!date) {
      rememberSavedAt();
      date = readSavedAt();
    }
    if (!date) return;
    const display = `Сохранено в ${date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    if (raw !== display) {
      writing = true;
      state.textContent = display;
      writing = false;
      previous = display;
    }
  };
  new MutationObserver(() => refresh()).observe(state, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  refresh();
  const button = document.getElementById("portal-save");
  button?.addEventListener("click", () => {
    window.setTimeout(() => {
      if (isSaved(state.textContent || "")) refresh(true);
    }, 0);
  });
}
function installSaveShortcut() {
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        (!event.ctrlKey && !event.metaKey) ||
        event.altKey ||
        event.key.toLowerCase() !== "s"
      )
        return;
      const button = document.getElementById(
        "portal-save",
      ) as HTMLButtonElement | null;
      if (!button || button.hidden || button.disabled || !button.offsetParent)
        return;
      event.preventDefault();
      button.click();
    },
    true,
  );
  const button = document.getElementById("portal-save");
  if (button && !button.title) button.title = "Сохранить персонажа · Ctrl+S";
}
/* Reveal the active portal destination or the selected companion launcher. */
function installSidebarReveal() {
  const bar = document.querySelector<HTMLElement>(".portal-sidebar");
  const nav = bar?.querySelector<HTMLElement>(".portal-nav");
  if (!bar || !nav) return;
  let frame = 0;
  const reveal = () => {
    if (bar.scrollHeight <= bar.clientHeight + 2) return;
    const active =
      nav.querySelector<HTMLElement>(".kx-launch[aria-current='page']") ||
      nav.querySelector<HTMLElement>("[data-view].active") ||
      nav.querySelector<HTMLElement>(
        ".online-gm-link[aria-current='page'], .online-gm-link.active",
      );
    if (!active) return;
    const barBox = bar.getBoundingClientRect();
    const itemBox = active.getBoundingClientRect();
    if (itemBox.top >= barBox.top - 1 && itemBox.bottom <= barBox.bottom + 1)
      return;
    const top =
      itemBox.top -
      barBox.top +
      bar.scrollTop -
      (bar.clientHeight - itemBox.height) / 2;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    bar.scrollTo({
      top: Math.max(0, top),
      behavior: reduce ? "auto" : "smooth",
    });
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      reveal();
    });
  };
  new MutationObserver(schedule).observe(nav, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-current"],
  });
  window.addEventListener("hashchange", schedule);
  schedule();
  setTimeout(schedule, 400);
}
export function installShell() {
  installSaveTime();
  installSaveShortcut();
  installSidebarReveal();
}
