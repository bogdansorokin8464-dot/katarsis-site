import type { CharacterCollection, Companion } from "./types";
declare global {
  interface Window {
    KATAR_PORTAL: { showView: (view: string) => void };
    KATAR_CHARACTERS: {
      isReady: () => boolean;
      collectionData: () => Promise<CharacterCollection>;
      importCollection: (
        data: CharacterCollection,
        mode: "replace" | "append",
        confirmed: boolean,
      ) => Promise<boolean>;
    };
  }
}
export function openView(view: string, target?: string) {
  window.KATAR_PORTAL.showView(view);
  if (target)
    requestAnimationFrame(() => {
      const n = document.getElementById(target);
      if (!n) return;
      for (let p: HTMLElement | null = n; p; p = p.parentElement)
        if (p instanceof HTMLDetailsElement) p.open = true;
      n.scrollIntoView({ block: "start", behavior: "smooth" });
    });
}
export function currentCharacter() {
  return (
    document
      .querySelector<HTMLSelectElement>("#characters-select")
      ?.selectedOptions[0]?.textContent?.replace(/^\d+\.\s*/, "") || ""
  );
}
export function download(data: {
  companion: Companion;
  collection: CharacterCollection;
}) {
  const payload = {
    format: "katarsis-companion-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "КАТАРСИС_полная_копия_" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
