import { useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, goResult, type Result } from "../search";
export function Search({
  close,
  initialQuery = "",
}: {
  close: () => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const index = useRef<Result[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const q = query.trim().toLocaleLowerCase("ru");
  const found = useMemo(() => {
    if (q.length < 2) return [];
    index.current ??= buildIndex();
    return index.current
      .filter((r) =>
        (r.name + " " + r.text).toLocaleLowerCase("ru").includes(q),
      )
      .sort(
        (a, b) =>
          Number(b.name.toLocaleLowerCase("ru").includes(q)) -
          Number(a.name.toLocaleLowerCase("ru").includes(q)),
      );
  }, [q]);
  return (
    <>
      <h3>Поиск по Катарсису</h3>
      <p className="kx-lead">
        Правила, способности, снаряжение и городские хроники. Быстрый вызов:
        Ctrl / ⌘ + K.
      </p>
      <label className="kx-label">
        <span>Что ищем?</span>
        <input
          ref={input}
          id="kx-query"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: стресс, Лекарь, Ольмгард"
        />
      </label>
      <p className="kx-hint">
        {q.length < 2
          ? "Введите не менее двух символов."
          : `Найдено: ${found.length}${found.length > 50 ? " · показаны первые 50" : ""}`}
      </p>
      <div className="kx-results">
        {found.slice(0, 50).map((r, i) => {
          const pos = r.text.toLocaleLowerCase("ru").indexOf(q),
            start = Math.max(0, pos - 70);
          return (
            <button
              className="kx-result"
              type="button"
              key={`${r.type}-${r.target || r.name}-${i}`}
              onClick={() => {
                close();
                goResult(r);
              }}
            >
              <strong>{r.name}</strong>
              <small>{r.type}</small>
              <span>
                {start ? "…" : ""}
                {r.text.slice(start, start + 190)}…
              </span>
            </button>
          );
        })}
        {q.length >= 2 && !found.length && (
          <p className="kx-empty">
            Ничего не найдено. Попробуйте другое слово.
          </p>
        )}
      </div>
    </>
  );
}
