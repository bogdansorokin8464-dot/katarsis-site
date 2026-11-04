import { openView } from "../bridge";
import { uid, type Companion } from "../types";
type Props = {
  data: Companion;
  update: (f: (s: Companion) => Companion) => void;
  status: string;
  close: () => void;
};
export function Gm({ data, update, status, close }: Props) {
  const gm = data.gm,
    list = gm.tracker,
    turn = list.length ? gm.turn % list.length : 0;
  const updateGm = (f: (g: Companion["gm"]) => Companion["gm"]) =>
    update((s) => ({ ...s, gm: f(s.gm) }));
  const text = (
    key: "scene" | "npcs" | "initiative" | "notes",
    value: string,
  ) => updateGm((g) => ({ ...g, [key]: value }));
  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    updateGm((g) => {
      const a = [...g.tracker];
      [a[i], a[j]] = [a[j], a[i]];
      return {
        ...g,
        tracker: a,
        turn: g.turn === i ? j : g.turn === j ? i : g.turn,
      };
    });
  }
  return (
    <>
      <h3>Режим Мастера</h3>
      <p className="kx-lead">
        Личные записи для подготовки и игры. Это ручные заметки: они не изменяют
        листы и не создают новых правил.
      </p>
      <div className="kx-grid">
        {(
          [
            ["scene", "Текущая сцена", "Место, обстановка и ближайший выбор"],
            [
              "npcs",
              "Персонажи Мастера",
              "Имена, цели, отношения и важные сведения",
            ],
            [
              "initiative",
              "Порядок ходов и состояния",
              "Например: имя — порядок — текущее состояние",
            ],
            ["notes", "Секреты и планы", "Последствия, улики и напоминания"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <section className="kx-card" key={key}>
            <label className="kx-label">
              <span>{label}</span>
              <textarea
                aria-label={label}
                maxLength={100000}
                value={gm[key]}
                placeholder={placeholder}
                onChange={(e) => text(key, e.target.value)}
              />
            </label>
          </section>
        ))}
      </div>
      <section className="kx-card">
        <h4>Очередь ходов</h4>
        <p className="kx-hint">
          Порядок и состояния вводятся вручную. Счётчик не применяет эффекты и
          не изменяет правила.
        </p>
        <div className="kx-fields">
          {!list.length && <p className="kx-empty">Пока участников нет.</p>}
          {list.map((x, i) => (
            <div className="kx-card" key={x.id}>
              <strong>
                {i === turn ? "▶ Сейчас ход: " : "Ход: "}
                {x.name || "Без имени"}
              </strong>
              <label className="kx-label">
                <span>Имя участника</span>
                <input
                  placeholder="Имя"
                  maxLength={500}
                  value={x.name}
                  onChange={(e) =>
                    updateGm((g) => ({
                      ...g,
                      tracker: g.tracker.map((t) =>
                        t.id === x.id ? { ...t, name: e.target.value } : t,
                      ),
                    }))
                  }
                />
              </label>
              <label className="kx-label">
                <span>Состояние участника</span>
                <input
                  placeholder="Заметки о состоянии"
                  maxLength={5000}
                  value={x.condition}
                  onChange={(e) =>
                    updateGm((g) => ({
                      ...g,
                      tracker: g.tracker.map((t) =>
                        t.id === x.id ? { ...t, condition: e.target.value } : t,
                      ),
                    }))
                  }
                />
              </label>
              <div className="kx-actions">
                <button
                  type="button"
                  className="kx-button"
                  aria-label={`Поднять ${x.name || "участника"}`}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="kx-button"
                  aria-label={`Опустить ${x.name || "участника"}`}
                  onClick={() => move(i, 1)}
                  disabled={i === list.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="kx-button"
                  onClick={() => {
                    if (confirm("Удалить участника из очереди?"))
                      updateGm((g) => {
                        const next = g.tracker.filter((t) => t.id !== x.id);
                        const t = i < g.turn ? g.turn - 1 : g.turn;
                        return {
                          ...g,
                          tracker: next,
                          turn: next.length ? t % next.length : 0,
                        };
                      });
                  }}
                >
                  Удалить участника
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="kx-actions">
          <button
            className="kx-button"
            type="button"
            disabled={list.length >= 100}
            onClick={() =>
              updateGm((g) => ({
                ...g,
                tracker: [...g.tracker, { id: uid(), name: "", condition: "" }],
              }))
            }
          >
            + Участник
          </button>
          <button
            className="kx-button"
            type="button"
            onClick={() =>
              updateGm((g) => ({
                ...g,
                turn: g.tracker.length ? (g.turn + 1) % g.tracker.length : 0,
              }))
            }
          >
            Следующий ход →
          </button>
        </div>
      </section>
      <div className="kx-actions">
        {(
          [
            ["rules", "Открыть правила"],
            ["combat", "Памятка по бою"],
            ["map", "Карта мира"],
          ] as const
        ).map(([view, label]) => (
          <button
            type="button"
            className="kx-button"
            key={view}
            onClick={() => {
              close();
              openView(view);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="kx-status" id="kx-status" role="status">
        {status}
      </p>
      <p className="kx-warning">
        Заметки Мастера видны всем, кто имеет доступ к этому браузеру и
        устройству. Они не защищены паролем.
      </p>
    </>
  );
}
