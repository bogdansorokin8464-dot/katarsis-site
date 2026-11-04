export type Tab = "search" | "journal" | "gm" | "backup";
export type Entry = {
  id: string;
  title: string;
  date: string;
  character: string;
  location: string;
  events: string;
  quests: string;
  questions: string;
};
export type Turn = { id: string; name: string; condition: string };
export type Companion = {
  version: 1;
  entries: Entry[];
  gm: {
    scene: string;
    npcs: string;
    initiative: string;
    notes: string;
    tracker: Turn[];
    turn: number;
  };
};
export type CharacterCollection = {
  format: "katarsis-collection";
  version: 1;
  active: string;
  characters: unknown[];
};
export type Backup = {
  format: "katarsis-companion-backup";
  version: 1;
  exportedAt: string;
  collection: CharacterCollection;
  companion: Companion;
};
export const STORAGE_KEY = "katarsis.companion.v1";
export const MAX_FILE = 200 * 1024 * 1024;
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const empty = (): Companion => ({
  version: 1,
  entries: [],
  gm: { scene: "", npcs: "", initiative: "", notes: "", tracker: [], turn: 0 },
});
export function validate(data: unknown): Companion {
  if (!data || typeof data !== "object")
    throw Error("Неверный формат журнала.");
  const d = data as Record<string, unknown>;
  if (
    d.version !== 1 ||
    !Array.isArray(d.entries) ||
    d.entries.length > 1000 ||
    !d.gm ||
    typeof d.gm !== "object" ||
    Array.isArray(d.gm)
  )
    throw Error("Неверный формат журнала.");
  for (const item of d.entries) {
    if (!item || typeof item !== "object")
      throw Error("Повреждена запись журнала.");
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== "string" ||
      ![
        "title",
        "date",
        "character",
        "location",
        "events",
        "quests",
        "questions",
      ].every(
        (k) => typeof e[k] === "string" && (e[k] as string).length <= 100000,
      )
    )
      throw Error("Повреждена запись журнала.");
  }
  const g = d.gm as Record<string, unknown>;
  for (const k of ["scene", "npcs", "initiative", "notes"])
    if (typeof g[k] !== "string" || (g[k] as string).length > 100000)
      throw Error("Повреждены заметки Мастера.");
  if (
    g.tracker !== undefined &&
    (!Array.isArray(g.tracker) ||
      g.tracker.length > 100 ||
      g.tracker.some((x: unknown) => {
        if (!x || typeof x !== "object") return true;
        const t = x as Record<string, unknown>;
        return (
          typeof t.id !== "string" ||
          typeof t.name !== "string" ||
          typeof t.condition !== "string" ||
          t.name.length > 500 ||
          t.condition.length > 5000
        );
      }))
  )
    throw Error("Повреждён порядок ходов.");
  if (
    g.turn !== undefined &&
    (!Number.isInteger(g.turn) || Number(g.turn) < 0 || Number(g.turn) > 100)
  )
    throw Error("Повреждён текущий ход.");
  // Return a fresh object; old version-one backups may not have a turn tracker.
  return {
    ...d,
    gm: { ...g, tracker: g.tracker ?? [], turn: g.turn ?? 0 },
  } as Companion;
}
export function load(): { data: Companion; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? validate(JSON.parse(raw)) : empty(), error: "" };
  } catch (e) {
    return {
      data: empty(),
      error:
        "Не удалось прочитать заметки. Данные не перезаписаны: " + message(e),
    };
  }
}
export const message = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
