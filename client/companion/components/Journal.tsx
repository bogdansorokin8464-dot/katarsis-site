import { useState } from "react";
import { currentCharacter } from "../bridge";
import { uid, type Companion, type Entry } from "../types";
type Props = {
  data: Companion;
  update: (f: (s: Companion) => Companion) => void;
  search: (q: string) => void;
  status: string;
};
export function Journal({ data, update, search, status }: Props) {
  const [selected, setSelected] = useState("");
  const entry = data.entries.find((e) => e.id === selected);
  function create() {
    if (data.entries.length >= 1000) return;
    const e: Entry = {
      id: uid(),
      title: "Новая сессия",
      date: new Date().toISOString().slice(0, 10),
      character: currentCharacter(),
      location: "",
      events: "",
      quests: "",
      questions: "",
    };
    update((s) => ({ ...s, entries: [e, ...s.entries] }));
    setSelected(e.id);
  }
  function edit(k: keyof Omit<Entry, "id">, v: string) {
    update((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === selected ? { ...e, [k]: v } : e)),
    }));
  }
  return (
    <>
      <h3>Журнал партии</h3>
      <p className="kx-lead">
        Записывайте сессии, задания и открытые вопросы. Персонаж и место —
        текстовые связи: их можно менять независимо от листов.
      </p>
      <div className="kx-actions">
        <button
          className="kx-button kx-primary"
          type="button"
          disabled={data.entries.length >= 1000}
          onClick={create}
        >
          + Новая запись
        </button>
      </div>
      <div className="kx-grid">
        <section className="kx-card">
          <h4>Записи · {data.entries.length}</h4>
          {!data.entries.length && (
            <p className="kx-empty">Пока записей нет.</p>
          )}
          {data.entries.map((e) => (
            <button
              type="button"
              className="kx-button"
              style={{ width: "100%", marginBottom: 6 }}
              key={e.id}
              onClick={() => setSelected(e.id)}
            >
              {e.date || "Без даты"} · {e.title || "Без названия"}
            </button>
          ))}
        </section>
        <section className="kx-card">
          {!entry ? (
            <p className="kx-empty">Выберите запись или создайте новую.</p>
          ) : (
            <>
              <h4>Редактирование записи</h4>
              <div className="kx-fields">
                {(
                  [
                    ["title", "Название"],
                    ["date", "Дата"],
                    ["character", "Персонажи"],
                    ["location", "Место"],
                    ["events", "События"],
                    ["quests", "Задания и решения"],
                    ["questions", "Открытые вопросы"],
                  ] as const
                ).map(([key, label]) => (
                  <label className="kx-label" key={key}>
                    <span>{label}</span>
                    {["events", "quests", "questions"].includes(key) ? (
                      <textarea
                        aria-label={label}
                        maxLength={100000}
                        value={entry[key]}
                        onChange={(e) => edit(key, e.target.value)}
                      />
                    ) : (
                      <input
                        aria-label={label}
                        type={key === "date" ? "date" : "text"}
                        maxLength={100000}
                        value={entry[key]}
                        onChange={(e) => edit(key, e.target.value)}
                        placeholder={
                          key === "character"
                            ? "Имена героев"
                            : key === "location"
                              ? "Например, Ольмгард"
                              : ""
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="kx-actions">
                <button
                  className="kx-button"
                  type="button"
                  onClick={() => search(entry.location.trim())}
                >
                  Найти место в хронике
                </button>
                <button
                  className="kx-button"
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "Удалить эту запись? Это действие нельзя отменить.",
                      )
                    ) {
                      update((s) => ({
                        ...s,
                        entries: s.entries.filter((e) => e.id !== entry.id),
                      }));
                      setSelected("");
                    }
                  }}
                >
                  Удалить запись
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      <p className="kx-status" id="kx-status" role="status">
        {status}
      </p>
    </>
  );
}
