import { useRef } from "react";
import { download } from "../bridge";
import {
  MAX_FILE,
  STORAGE_KEY,
  message,
  validate,
  type Companion,
  type CharacterCollection,
} from "../types";
export function Backup({
  data,
  replace,
  status,
  setStatus,
  storageError,
  busy,
  setBusy,
}: {
  data: Companion;
  replace: (s: Companion) => void;
  status: string;
  setStatus: (s: string) => void;
  storageError: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  async function exportAll() {
    setBusy(true);
    try {
      if (storageError)
        throw Error(
          "Сначала устраните ошибку чтения заметок: их нельзя безопасно включить в копию.",
        );
      const collection = await window.KATAR_CHARACTERS.collectionData();
      download({ companion: data, collection });
      try {
        localStorage.setItem(
          "katarsis.companion.backupDate",
          new Date().toISOString(),
        );
      } catch {}
      setStatus("Полная резервная копия скачана.");
    } catch (e) {
      setStatus("Не удалось создать копию: " + message(e));
    } finally {
      setBusy(false);
    }
  }
  async function importAll(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      if (f.size > MAX_FILE) throw Error("Файл больше 200 МБ.");
      const d: unknown = JSON.parse(await f.text());
      if (!d || typeof d !== "object")
        throw Error("Это не полная резервная копия Катарсиса.");
      const packet = d as Record<string, unknown>;
      if (packet.format !== "katarsis-companion-backup" || packet.version !== 1)
        throw Error("Это не полная резервная копия Катарсиса.");
      const companion = validate(packet.companion);
      const collection = packet.collection as CharacterCollection;
      if (
        collection?.format !== "katarsis-collection" ||
        collection.version !== 1 ||
        !Array.isArray(collection.characters)
      )
        throw Error("Коллекция персонажей повреждена.");
      if (storageError)
        throw Error(
          "Сначала устраните ошибку доступа к заметкам; существующие данные не будут заменены.",
        );
      if (
        !confirm(
          "Заменить ВСЕХ персонажей, журнал и заметки Мастера данными из файла? Сначала скачайте текущую резервную копию.",
        )
      )
        return;
      const previous = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companion));
      try {
        const ok = await window.KATAR_CHARACTERS.importCollection(
          collection,
          "replace",
          true,
        );
        if (!ok) throw Error("Не удалось восстановить коллекцию.");
      } catch (e) {
        if (previous === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, previous);
        throw e;
      }
      replace(companion);
      setStatus("Полная копия восстановлена.");
    } catch (e) {
      setStatus("Импорт не выполнен: " + message(e));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }
  return (
    <>
      <h3>Резервная копия</h3>
      <p className="kx-lead">
        Один JSON-файл с коллекцией персонажей, журналом и заметками Мастера. Он
        может содержать портреты и секреты кампании. Храните файл в надёжном
        месте.
      </p>
      <p className="kx-warning">
        Импорт заменяет всю текущую коллекцию и все заметки. Перед
        восстановлением обязательно сохраните текущую копию.
      </p>
      <div className="kx-actions">
        <button
          type="button"
          className="kx-button kx-primary"
          disabled={busy}
          onClick={exportAll}
        >
          Скачать полную копию
        </button>
        <button
          type="button"
          className="kx-button"
          disabled={busy}
          onClick={() => file.current?.click()}
        >
          Восстановить из полной копии
        </button>
        <input
          ref={file}
          type="file"
          hidden
          accept=".json,application/json"
          onChange={(e) => importAll(e.target.files?.[0])}
        />
      </div>
      <p className="kx-status" id="kx-status" role="status">
        {status}
      </p>
    </>
  );
}
