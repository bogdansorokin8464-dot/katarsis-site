// Non-invasive additions to the original, not-yet-migrated views.
export function installLegacyEnhancements(openBackup: () => void) {
  const tips: [string, string, string][] = [
    [
      "#portal-step-0",
      "С чего начать?",
      "Придумайте имя и происхождение. Предысторию можно дополнить позже в листе; механические параметры от неё автоматически не меняются.",
    ],
    [
      "#portal-step-1",
      "Знамение и призвание — в чём разница?",
      "Знамение определяет родную характеристику, особый бонус и два стартовых умения. Призвание выбирается отдельно и даёт ключ и два своих стартовых умения. Смена знамения сбрасывает связанные выборы; проверьте распределение характеристик.",
    ],
    [
      "#portal-step-2",
      "Как выбрать характеристики?",
      "Стандартный набор даёт +3 родной характеристике; остальные значения распределяются по одному. При бросках каждый результат к6 − 3 назначается свободной характеристике, включая родную.",
    ],
    [
      "#portal-step-3",
      "Как выбирать призвание?",
      "Выберите образ и прочитайте ключ и умения. Ключ добавляется автоматически; два умения выбираются отдельно. При смене призвания проверьте связанные выборы.",
    ],
    [
      "#portal-step-4",
      "Изученный навык — не умение",
      "Навык использует модификатор связанной характеристики. Один выбранный изученный навык дополнительно получает модификатор родного знамения, в том числе если он отрицательный.",
    ],
    [
      "#portal-step-5",
      "Пример персонажа",
      "Например, странствующий лекарь: знамение Мудрости, призвание Лекаря и изученная Медицина. При стандартном наборе Мудрость +3: Медицина как навык Мудрости получает +3 и ещё +3 за изучение, итого +6. Умения и остальные характеристики выберите сами. Это пример, а не автоматическое заполнение.",
    ],
  ];
  for (const [selector, title, text] of tips) {
    const target = document.querySelector(selector);
    if (!target || target.querySelector(".kx-tip")) continue;
    const d = document.createElement("details"),
      summary = document.createElement("summary"),
      p = document.createElement("p");
    d.className = "kx-tip";
    summary.textContent = title;
    p.textContent = text;
    d.append(summary, p);
    target.insertBefore(d, target.children[2] || null);
  }
  const cities = [
    ...document.querySelectorAll<HTMLElement>(
      ".lore-book-city[id],.lore-regional-entry[id]",
    ),
  ]
    .map((node) => ({
      node,
      id: node.id,
      name:
        node
          .querySelector("h2,summary span")
          ?.childNodes[0]?.textContent?.trim() || "",
    }))
    .filter((x) => x.name.length > 3);
  const button = (text: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kx-button";
    b.textContent = text;
    b.onclick = fn;
    return b;
  };
  for (const city of cities) {
    const parts = [
      ...city.node.querySelectorAll<HTMLDetailsElement>(".lore-book-part"),
    ].filter((p) => p.querySelector("summary"));
    if (parts.length) {
      const box = document.createElement("div"),
        strong = document.createElement("strong"),
        p = document.createElement("p"),
        actions = document.createElement("div");
      box.className = "kx-links";
      strong.textContent = "Разделы хроники";
      p.textContent =
        "События, действующие лица, конфликты и зацепки — в разделах этого города.";
      actions.className = "kx-actions";
      parts.forEach((part, i) => {
        part.id ||= `kx-${city.id}-part-${i}`;
        actions.append(
          button(
            part.querySelector("summary")?.textContent?.trim() || "",
            () => {
              part.open = true;
              part.scrollIntoView({ block: "start", behavior: "smooth" });
            },
          ),
        );
      });
      box.append(strong, p, actions);
      city.node.querySelector("h2")?.after(box);
    }
  }
  for (const city of cities) {
    const text = city.node.textContent?.toLocaleLowerCase("ru") || "",
      matches = cities
        .filter(
          (c) => c !== city && text.includes(c.name.toLocaleLowerCase("ru")),
        )
        .slice(0, 12);
    if (!matches.length) continue;
    const box = document.createElement("div"),
      strong = document.createElement("strong"),
      p = document.createElement("p"),
      actions = document.createElement("div");
    box.className = "kx-links";
    strong.textContent = "Упоминаемые города";
    p.textContent =
      "Связи найдены по названиям в тексте, а не означают новый канон.";
    actions.className = "kx-actions";
    for (const c of matches)
      actions.append(
        button(c.name, () => {
          for (let n: HTMLElement | null = c.node; n; n = n.parentElement)
            if (n instanceof HTMLDetailsElement) n.open = true;
          c.node.scrollIntoView({ block: "start", behavior: "smooth" });
        }),
      );
    box.append(strong, p, actions);
    if (city.node instanceof HTMLDetailsElement)
      city.node.querySelector(".lore-book-prose")?.append(box);
    else city.node.append(box);
  }
  const panel = document.querySelector("#characters-panel");
  if (panel) {
    const actions = document.createElement("div");
    actions.className = "kx-actions";
    actions.append(button("Полная копия · персонажи и заметки", openBackup));
    panel.append(actions);
  }
}
