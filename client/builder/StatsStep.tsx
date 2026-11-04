import { useEffect, useRef, useState } from "react";
import { DiceCube, type CubeHandle } from "./DiceCube";
import {
  assignStat,
  chooseMethod,
  format,
  motionOff,
  resetStats,
  rollDie,
  STAT_NAMES,
  undoStat,
  statsEngine,
} from "./stats";
import { useStats } from "./useStats";
const RULE = "к6: 6 → +3 · 5 → +2 · 4 → +1 · 3 → 0 · 2 → −1 · 1 → −2";
export function StatsStep() {
  const { snapshot, refresh } = useStats();
  const cube = useRef<CubeHandle>(null),
    token = useRef<HTMLButtonElement>(null),
    tiles = useRef(new Map<string, HTMLButtonElement>()),
    gesture = useRef<{
      id: number;
      startX: number;
      startY: number;
      x: number;
      y: number;
    } | null>(null),
    ghost = useRef<HTMLDivElement | null>(null),
    frame = useRef(0),
    suppress = useRef(false);
  const [busy, setBusy] = useState(false),
    [armed, setArmed] = useState(false),
    [target, setTarget] = useState(""),
    [message, setMessage] = useState(
      "Выбери броски к6 или стандартный набор выше.",
    );
  useEffect(() => {
    if (!snapshot) return;
    const { mode, pending, available, assigned, pendingValue, native } =
      snapshot;
    let next;
    if (!mode) next = "Выбери броски к6 или стандартный набор выше.";
    else if (assigned.length === 8)
      next = "Готово. Все восемь характеристик распределены.";
    else if (mode === "standard" && !native)
      next = "Для стандартного набора сначала выбери знамение.";
    else if (available)
      next =
        mode === "roll" && pending
          ? `На к6 — ${pending.die}. Модификатор ${format(pendingValue ?? 0)}. Перетащи его в характеристику.`
          : `Назначь ${format(pendingValue ?? 0)} свободной характеристике.`;
    else next = "Брось к6. Пусть начнётся твоя история.";
    setMessage(next);
  }, [snapshot]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      ghost.current?.remove();
    },
    [],
  );
  if (!snapshot) return null;
  const {
    mode,
    history,
    pending,
    native,
    allowed,
    assigned,
    values,
    available,
    pendingValue,
    pendingText,
    progressText,
    warning,
    warningText,
    historyItems,
    undoDisabled,
  } = snapshot;
  const assignedSet = new Set(assigned),
    die = mode === "roll" ? (pending?.die ?? null) : null;
  const display = busy
    ? "Кубик в полёте…"
    : armed
      ? "Теперь выбери свободную характеристику ниже."
      : message;
  async function onRoll() {
    if (busy || mode !== "roll" || Boolean(pending) || history.length >= 8)
      return;
    setArmed(false);
    rollDie();
    refresh();
    if (motionOff()) return;
    setBusy(true);
    await cube.current?.spin();
    setBusy(false);
  }
  function hover(x: number, y: number) {
    let hit = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>(".dice-target");
    if (hit?.hasAttribute("disabled")) hit = null;
    for (const tile of tiles.current.values())
      tile.classList.toggle("is-over", tile === hit);
    return hit;
  }
  function track() {
    const current = gesture.current;
    if (!current || !ghost.current) return;
    const speed = current.y > innerHeight - 90 ? 5 : current.y < 90 ? -5 : 0;
    if (speed) window.scrollBy({ top: speed, behavior: "instant" });
    hover(current.x, current.y);
    frame.current = requestAnimationFrame(track);
  }
  function finish(pointerId: number, cancel = false, clientX = 0, clientY = 0) {
    const current = gesture.current;
    if (!current || current.id !== pointerId) return;
    const dragged = Boolean(ghost.current),
      hit = dragged && !cancel ? hover(clientX, clientY) : null;
    gesture.current = null;
    cancelAnimationFrame(frame.current);
    ghost.current?.remove();
    ghost.current = null;
    for (const tile of tiles.current.values()) tile.classList.remove("is-over");
    const node = token.current;
    if (node?.hasPointerCapture(pointerId))
      node.releasePointerCapture(pointerId);
    if (dragged) {
      suppress.current = true;
      setTimeout(() => {
        suppress.current = false;
      }, 0);
      if (hit) assign(hit.dataset.stat || "");
    }
  }
  function assign(name: string) {
    const tile = tiles.current.get(name);
    if (busy || !tile || tile.disabled || !name) return;
    const before = statsEngine()?.get().history.length ?? 0;
    assignStat(name);
    refresh();
    setArmed(false);
    if ((statsEngine()?.get().history.length ?? 0) > before && !motionOff())
      tile.animate(
        [
          { transform: "translateY(-4px) scale(1.04)", background: "#d7c29e" },
          { transform: "translateY(0) scale(1)", background: "#eee6f2" },
        ],
        { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" },
      );
  }
  return (
    <>
      <div
        className="stats-methods"
        role="radiogroup"
        aria-label="Способ распределения характеристик"
      >
        {(
          [
            [
              "roll",
              "Броски к6",
              "8 бросков по одному. Результат каждого назначается свободной характеристике, включая родную.",
            ],
            [
              "standard",
              "Стандартный набор",
              "+3 родной · +2 · +2 · +1 · +1 · 0 · −1 · −2",
            ],
          ] as const
        ).map(([value, title, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            className={"react-method" + (mode === value ? " is-active" : "")}
            onClick={() => {
              chooseMethod(value);
              refresh();
            }}
          >
            <span className="react-method-dot" aria-hidden="true" />
            <strong className="react-method-title">{title}</strong>
            <span className="react-method-text">{text}</span>
          </button>
        ))}
      </div>
      <p className="stats-rule">{RULE}</p>
      {warning ? (
        <p className="react-stats-warning" role="status">
          {warningText}
        </p>
      ) : null}
      <section
        className={"dice-table" + (busy ? " is-rolling" : "")}
        aria-label="Игровой стол распределения характеристик"
      >
        <div className="dice-arena">
          <span className="dice-arena-label">
            КАТАРСИС / ВОСЕМЬ ГРАНЕЙ ГЕРОЯ
          </span>
          <span className="dice-progress">{assignedSet.size} / 8</span>
          <div className="dice-perspective">
            <button
              ref={token}
              type="button"
              className={
                "dice-token" +
                (available && !busy ? " is-ready" : "") +
                (armed && available && !busy ? " is-armed" : "")
              }
              disabled={busy || !available}
              aria-label={
                available && !busy
                  ? `Результат ${format(pendingValue ?? 0)}. Перетащите кубик или выберите характеристику ниже.`
                  : busy
                    ? "Кубик летит"
                    : "Нет результата для назначения"
              }
              onClick={() => {
                if (suppress.current || busy || !available) return;
                setArmed((a) => !a);
              }}
              onPointerDown={(e) => {
                if (busy || !available || e.button !== 0) return;
                gesture.current = {
                  id: e.pointerId,
                  startX: e.clientX,
                  startY: e.clientY,
                  x: e.clientX,
                  y: e.clientY,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const current = gesture.current;
                if (!current || current.id !== e.pointerId) return;
                current.x = e.clientX;
                current.y = e.clientY;
                if (
                  !ghost.current &&
                  Math.hypot(
                    e.clientX - current.startX,
                    e.clientY - current.startY,
                  ) > 7
                ) {
                  const node = document.createElement("div");
                  node.className = "dice-drag-ghost";
                  node.setAttribute("aria-hidden", "true");
                  node.textContent = format(pendingValue ?? 0);
                  document.body.append(node);
                  ghost.current = node;
                  frame.current = requestAnimationFrame(track);
                }
                if (ghost.current) {
                  ghost.current.style.left = e.clientX + "px";
                  ghost.current.style.top = e.clientY + "px";
                  hover(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) =>
                finish(e.pointerId, false, e.clientX, e.clientY)
              }
              onPointerCancel={(e) => finish(e.pointerId, true)}
              onLostPointerCapture={(e) => {
                if (gesture.current) finish(e.pointerId, true);
              }}
            >
              <DiceCube ref={cube} die={die} value={pendingValue} />
            </button>
            <div className="dice-shadow" aria-hidden="true" />
          </div>
          <div
            className="dice-result"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {display}
          </div>
        </div>
        <div className="dice-toolbar">
          <button
            type="button"
            className="dice-roll"
            hidden={mode !== "roll"}
            disabled={busy || Boolean(pending) || history.length >= 8}
            onClick={onRoll}
          >
            Бросить к6
          </button>
          <p className="dice-hint">
            Перетащи кубик в характеристику — или нажми на кубик, затем на
            карточку.
          </p>
        </div>
        <div
          className="dice-targets"
          role="group"
          aria-label="Назначить результат характеристике"
        >
          {STAT_NAMES.map((name) => {
            const used = assignedSet.has(name),
              can = available && !busy && allowed.includes(name),
              current = values[name] || "—";
            return (
              <button
                key={name}
                type="button"
                data-stat={name}
                ref={(node) => {
                  if (node) tiles.current.set(name, node);
                  else tiles.current.delete(name);
                }}
                className={
                  "dice-target" +
                  (used ? " is-assigned" : "") +
                  (can ? " is-available" : "")
                }
                disabled={!can}
                onClick={() => assign(name)}
                aria-label={`${name}: ${current}${can ? `. Назначить ${format(pendingValue ?? 0)}` : used ? ". Уже назначено" : ". Ожидает броска"}`}
              >
                <span>{name}</span>
                <strong>{current}</strong>
                <small>
                  {used
                    ? "Назначено"
                    : can
                      ? `Положи сюда ${format(pendingValue ?? 0)}`
                      : "Свободно"}
                </small>
              </button>
            );
          })}
        </div>
        <p className="dice-table-note">
          К6 − 3 = модификатор. Сначала назначь результат, затем бросай снова.
          Назначенный результат можно вернуть кнопкой отмены ниже.
        </p>
      </section>
      {mode ? (
        <p className="react-stats-pending" role="status" aria-live="polite">
          {pendingText}
        </p>
      ) : null}
      {mode ? (
        <div className="stats-actions">
          <select
            aria-label="Характеристика для результата"
            value={target}
            disabled={!available || busy}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Выберите характеристику</option>
            {STAT_NAMES.filter((name) => allowed.includes(name)).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!target || !available || busy}
            onClick={() => {
              const name = target;
              setTarget("");
              if (name) assign(name);
            }}
          >
            Назначить
          </button>
          <button
            type="button"
            disabled={undoDisabled || busy}
            onClick={() => {
              undoStat();
              refresh();
            }}
          >
            Отменить назначение
          </button>
          <button
            type="button"
            onClick={() => {
              resetStats();
              refresh();
            }}
          >
            Начать заново
          </button>
        </div>
      ) : null}
      <p className="react-stats-progress" role="status">
        {progressText}
      </p>
      <ul className="react-stats-history" aria-label="История распределения">
        {historyItems.map((item, i) => (
          <li key={item + i}>{item}</li>
        ))}
      </ul>
    </>
  );
}
