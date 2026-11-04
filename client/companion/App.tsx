import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "./components/Search";
import { Journal } from "./components/Journal";
import { Gm } from "./components/Gm";
import { Backup } from "./components/Backup";
import { installLegacyEnhancements } from "./legacy-enhancements";
import { installShell } from "./shell";
import { allowAutoCopy, saveCopy } from "./autobackup";
import { load, message, STORAGE_KEY, type Companion, type Tab } from "./types";
const tabs: [Tab, string][] = [
  ["search", "⌕ Поиск"],
  ["journal", "Журнал партии"],
  ["gm", "Режим Мастера"],
  ["backup", "Резервная копия"],
];
const defaultStatus =
  "Заметки хранятся только в этом браузере. Регулярно скачивайте резервную копию.";
export function App() {
  const initial = useRef(load()),
    [data, setData] = useState<Companion>(initial.current.data),
    dataRef = useRef(data),
    [status, setStatus] = useState(initial.current.error || defaultStatus);
  const [tab, setTab] = useState<Tab>("search"),
    [isOpen, setIsOpen] = useState(false),
    [searchQuery, setSearchQuery] = useState(""),
    [searchGeneration, setSearchGeneration] = useState(0),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    busyRef = useRef(false);
  const changeBusy = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };
  const activateLauncher = (t: Tab) => {
    document
      .querySelectorAll<HTMLElement>(".kx-launch[data-kx-tab]")
      .forEach((item) => {
        const active = item.dataset.kxTab === t;
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
  };
  const open = useCallback((t: Tab, q = "") => {
    if (busyRef.current) return;
    activateLauncher(t);
    setTab(t);
    setSearchQuery(q);
    if (t === "search") setSearchGeneration((n) => n + 1);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    dialog.current?.close();
    setIsOpen(false);
  }, []);
  useEffect(() => {
    if (isOpen && !dialog.current?.open) dialog.current?.showModal();
  }, [isOpen]);
  /* Автоматическая копия при открытии сайта — только после готовности
     коллекции, не чаще раза в 10 минут и лишь при изменении данных. */
  useEffect(() => {
    let stopped = false;
    const ready = async () => {
      for (let i = 0; i < 60; i++) {
        if (stopped || window.KATAR_CHARACTERS?.isReady()) return !stopped;
        await new Promise((r) => setTimeout(r, 250));
      }
      return false;
    };
    void (async () => {
      if (stopped || !(await ready()) || !allowAutoCopy()) return;
      try {
        const collection = await window.KATAR_CHARACTERS.collectionData();
        await saveCopy({ companion: dataRef.current, collection }, "auto");
      } catch {}
    })();
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    const nav = document.querySelector(".portal-nav");
    const buttons: HTMLButtonElement[] = [];
    for (const [key, label] of [
      ["search", "⌕ Поиск по миру"],
      ["journal", "✎ Журнал партии"],
      ["gm", "◇ Режим Мастера"],
      ["backup", "↓ Резервная копия"],
    ] as [Tab, string][]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kx-launch";
      b.dataset.kxTab = key;
      b.textContent = label;
      b.onclick = () => open(key);
      nav?.insertBefore(b, nav.querySelector(".online-gm-link"));
      buttons.push(b);
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open("search");
      }
    };
    document.addEventListener("keydown", onKey);
    installShell();
    installLegacyEnhancements(() => open("backup"));
    return () => {
      buttons.forEach((b) => b.remove());
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  function update(f: (s: Companion) => Companion) {
    if (initial.current.error) {
      setStatus(initial.current.error);
      return;
    }
    const next = f(dataRef.current);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      dataRef.current = next;
      setData(next);
      setStatus("Сохранено в этом браузере.");
    } catch (e) {
      setStatus(
        "Не удалось сохранить заметки. Освободите место в браузере и скачайте резервную копию. " +
          message(e),
      );
    }
  }
  function replace(next: Companion) {
    dataRef.current = next;
    setData(next);
  }
  return (
    <dialog
      ref={dialog}
      className="kx-dialog"
      aria-label="Инструменты партии"
      onClose={() => setIsOpen(false)}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClick={(e) => {
        if (!busy && e.target === e.currentTarget) close();
      }}
    >
      <div className="kx-shell">
        <header className="kx-head">
          <h2>Инструменты партии</h2>
          <button
            type="button"
            className="kx-close"
            aria-label="Закрыть инструменты"
            disabled={busy}
            onClick={close}
          >
            Закрыть ✕
          </button>
        </header>
        <nav className="kx-tabs" aria-label="Разделы инструментов">
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              disabled={busy}
              aria-selected={tab === key}
              onClick={() => {
                activateLauncher(key);
                setTab(key);
                if (key === "search") setSearchGeneration((n) => n + 1);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <main className="kx-body">
          {tab === "search" && (
            <Search
              key={searchGeneration}
              initialQuery={searchQuery}
              close={close}
            />
          )}{" "}
          {tab === "journal" && (
            <Journal
              data={data}
              update={update}
              search={(q) => open("search", q)}
              status={status}
            />
          )}{" "}
          {tab === "gm" && (
            <Gm data={data} update={update} close={close} status={status} />
          )}{" "}
          {tab === "backup" && (
            <Backup
              data={data}
              replace={replace}
              status={status}
              setStatus={setStatus}
              storageError={initial.current.error}
              busy={busy}
              setBusy={changeBusy}
            />
          )}
        </main>
      </div>
    </dialog>
  );
}
