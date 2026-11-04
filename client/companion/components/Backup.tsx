import { useEffect, useRef, useState } from "react";
import { download } from "../bridge";
import {
  exportAgeDays,
  formatSize,
  listCopies,
  readCopy,
  removeCopy,
  saveCopy,
  type CopyMeta,
  type CopyPayload,
} from "../autobackup";
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
  const [copies, setCopies] = useState<CopyMeta[]>([]),
    [copyStatus, setCopyStatus] = useState("");
  const days = exportAgeDays();
  async function refreshCopies() {
    setCopies(await listCopies());
  }
  useEffect(() => {
    void refreshCopies();
  }, []);
  /* Перед любой заменой данных сохраняем страховочную копию. */
  async function keepCurrent(): Promise<boolean> {
    try {
      const collection = await window.KATAR_CHARACTERS.collectionData();
      const saved = await saveCopy(
        { companion: data, collection },
        "before-restore",
      );
      await refreshCopies();
      return saved;
    } catch {
      return false;
    }
  }
  async function applyPacket(packet: CopyPayload) {
    if (storageError)
      throw Error(
        "Сначала устраните ошибку доступа к заметкам; существующие данные не будут заменены.",
      );
    const previous = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packet.companion));
    try {
      const ok = await window.KATAR_CHARACTERS.importCollection(
        packet.collection,
        "replace",
        true,
      );
      if (!ok) throw Error("Не удалось восстановить коллекцию.");
    } catch (e) {
      if (previous === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, previous);
      throw e;
    }
    replace(packet.companion);
  }
  async function restoreCopy(meta: CopyMeta) {
    setBusy(true);
    setCopyStatus("");
    try {
      const packet = await readCopy(meta.id);
      if (!packet)
        throw Error("Копия не найдена: возможно, браузер удалил её.");
      if (
        !confirm(
          `Заменить всех персонажей, журнал и заметки данными копии от ${new Date(meta.time).toLocaleString("ru-RU")}? Текущее состояние будет сохранено в автоматических копиях, если отличается от уже имеющихся.`,
        )
      )
        return;
      await keepCurrent();
      await applyPacket(packet);
      setStatus("Данные восстановлены из автоматической копии.");
      await refreshCopies();
    } catch (e) {
      setStatus("Восстановление не выполнено: " + message(e));
    } finally {
      setBusy(false);
    }
  }
  async function downloadCopy(meta: CopyMeta) {
    const packet = await readCopy(meta.id);
    if (!packet) {
      setCopyStatus("Копия не найдена.");
      return;
    }
    download(packet);
    setCopyStatus("Копия скачана отдельным файлом.");
  }
  async function deleteCopy(meta: CopyMeta) {
    if (!confirm("Удалить эту автоматическую копию?")) return;
    await removeCopy(meta.id);
    await refreshCopies();
    setCopyStatus("Копия удалена.");
  }
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
          "Заменить ВСЕХ персонажей, журнал и заметки Мастера данными из файла? Текущее состояние будет сохранено в автоматических копиях, если отличается от уже имеющихся.",
        )
      )
        return;
      const kept = await keepCurrent();
      await applyPacket({ companion, collection });
      setStatus(
        kept
          ? "Полная копия восстановлена. Прежнее состояние сохранено в автоматических копиях."
          : "Полная копия восстановлена. Прежнее состояние уже было в копиях либо автоматическое сохранение не удалось.",
      );
      await refreshCopies();
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
        восстановлением система сохранит текущее состояние в автоматических
        копиях, если оно отличается от уже сохранённых. Для защиты от очистки
        браузера отдельно скачайте полную копию.
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
      <p className="kx-note" id="kx-export-reminder">
        {days === null
          ? "Полную копию ещё ни разу не скачивали: файл переживёт очистку браузера, поэтому стоит его сохранить."
          : days >= 14
            ? `Последняя полная копия скачана ${days} дн. назад. Стоит обновить файл.`
            : days === 0
              ? "Полная копия скачана сегодня."
              : `Последняя полная копия: ${days} дн. назад.`}
      </p>
      <h4>Автоматические копии в этом браузере</h4>
      <p className="kx-hint">
        Создаются при открытии сайта и перед восстановлением из файла. Хранятся
        последние три; при очистке данных браузера они исчезнут.
      </p>
      {copies.length ? (
        <div className="kx-copies">
          {copies.map((meta) => (
            <div className="kx-copy" key={meta.id}>
              <div>
                <strong>
                  {new Date(meta.time).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <small>
                  {meta.kind === "before-restore"
                    ? "перед восстановлением"
                    : "при открытии сайта"}
                  {" · "}
                  {meta.characters} перс. · {meta.entries} зап. ·{" "}
                  {formatSize(meta.size)}
                </small>
              </div>
              <div className="kx-actions">
                <button
                  type="button"
                  className="kx-button"
                  disabled={busy}
                  onClick={() => restoreCopy(meta)}
                >
                  Восстановить
                </button>
                <button
                  type="button"
                  className="kx-button"
                  disabled={busy}
                  onClick={() => downloadCopy(meta)}
                >
                  Скачать
                </button>
                <button
                  type="button"
                  className="kx-button"
                  disabled={busy}
                  onClick={() => deleteCopy(meta)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="kx-empty">Автоматических копий пока нет.</p>
      )}
      <p className="kx-status" role="status">
        {copyStatus}
      </p>
      <p className="kx-status" id="kx-status" role="status">
        {status}
      </p>
    </>
  );
}
