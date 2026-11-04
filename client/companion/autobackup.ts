/* Rotating automatic copies of everything the manual backup file contains.
   They live in their own IndexedDB store so portraits never hit localStorage
   limits, and every failure stays silent: a backup must never break the game. */
import type { CharacterCollection, Companion } from "./types";
export type CopyKind = "auto" | "before-restore";
export type CopyPayload = {
  companion: Companion;
  collection: CharacterCollection;
};
export type CopyMeta = {
  id: string;
  time: number;
  kind: CopyKind;
  characters: number;
  entries: number;
  size: number;
};
const DB_NAME = "katarsis.autobackup.v1";
const STORE = "copies";
const LIMIT = 3;
const VOLATILE = new Set(["savedAt", "ui"]);
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Upgrade existing v1/v2 stores and repair an empty database if another tab
    // opened the name before the application initialized its object store.
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error("Хранилище занято"));
  });
}
function run<T>(
  mode: IDBTransactionMode,
  job: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = job(tx.objectStore(STORE));
        let result: T;
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error || Error("Операция с копией отменена"));
        };
      }),
  );
}
/* Volatile keys (описание экрана, отметка времени каждого листа) не должны
   считать данные «изменёнными»: иначе каждая навигация съедала бы копию. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>))
      if (!VOLATILE.has(key)) out[key] = stable(item);
    return out;
  }
  return value;
}
function hash(value: unknown) {
  const text = JSON.stringify(stable(value));
  let h = 5381;
  for (let i = 0; i < text.length; i++)
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${h >>> 0}:${text.length}`;
}
function pack(entry: Record<string, unknown>): CopyMeta {
  return {
    id: String(entry.id),
    time: Number(entry.time) || 0,
    kind: entry.kind === "before-restore" ? "before-restore" : "auto",
    characters: Number(entry.characters) || 0,
    entries: Number(entry.entries) || 0,
    size: Number(entry.size) || 0,
  };
}
export async function listCopies(): Promise<CopyMeta[]> {
  try {
    const rows = await run<Record<string, unknown>[]>(
      "readonly",
      (store) => store.getAll() as IDBRequest<Record<string, unknown>[]>,
    );
    return rows.map(pack).sort((a, b) => b.time - a.time);
  } catch {
    return [];
  }
}
export async function readCopy(id: string): Promise<CopyPayload | null> {
  try {
    const row = await run<Record<string, unknown> | undefined>(
      "readonly",
      (store) =>
        store.get(id) as IDBRequest<Record<string, unknown> | undefined>,
    );
    const payload = row?.payload as CopyPayload | undefined;
    return payload && payload.companion && payload.collection ? payload : null;
  } catch {
    return null;
  }
}
export async function removeCopy(id: string): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(id));
  } catch {}
}
function empty(payload: CopyPayload) {
  const gm = payload.companion?.gm;
  const notes = [gm?.scene, gm?.npcs, gm?.initiative, gm?.notes]
    .map((value) => String(value || "").trim())
    .join("");
  return (
    !payload.companion?.entries?.length &&
    !notes &&
    !payload.collection?.characters?.length
  );
}
export async function saveCopy(
  payload: CopyPayload,
  kind: CopyKind = "auto",
): Promise<boolean> {
  try {
    if (empty(payload)) return false;
    const fingerprint = hash(payload);
    const time = Date.now();
    const record = {
      id: `${time}-${kind}-${Math.random().toString(36).slice(2, 9)}`,
      time,
      kind,
      hash: fingerprint,
      characters: payload.collection?.characters?.length || 0,
      entries: payload.companion?.entries?.length || 0,
      size: new Blob([JSON.stringify(payload)]).size,
      payload,
    };
    const db = await open();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let saved = false;
      store.getAll().onsuccess = (event) => {
        const rows = (event.target as IDBRequest<Record<string, unknown>[]>)
          .result;
        if (rows.some((row) => row.hash === fingerprint)) return;
        saved = true;
        store.put(record);
        const stale = rows
          .concat([record as unknown as Record<string, unknown>])
          .map(pack)
          .sort((a, b) => b.time - a.time)
          .slice(LIMIT);
        for (const item of stale) store.delete(item.id);
      };
      tx.oncomplete = () => {
        db.close();
        resolve(saved);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || Error("Сохранение копии отменено"));
      };
    });
  } catch {
    return false;
  }
}
const LAST_LOAD = "katarsis.autobackup.lastLoad";
/* Одна копия на открытие сайта плюс страховка не чаще раза в 10 минут. */
export function allowAutoCopy() {
  try {
    const last = Number(localStorage.getItem(LAST_LOAD) || 0);
    if (Date.now() - last < 10 * 60 * 1000) return false;
    localStorage.setItem(LAST_LOAD, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}
export const EXPORT_KEY = "katarsis.companion.backupDate";
export function lastExport(): Date | null {
  try {
    const raw = localStorage.getItem(EXPORT_KEY);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(+date) ? null : date;
  } catch {
    return null;
  }
}
export function exportAgeDays(): number | null {
  const date = lastExport();
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - +date) / 86400000));
}
export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
