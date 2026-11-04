import { openView } from "./bridge";
// These are the existing catalogues declared by the original player document.
declare const OMEN_DATA: Record<string, { skills: string[][] }>;
declare const VOCATION_DATA: Record<
  string,
  { key: string[]; skills: string[][] }
>;
declare const SHOP_CATALOG: Array<{
  name: string;
  category: string;
  description: string;
  price: number;
}>;
export type Result = {
  type: string;
  name: string;
  text: string;
  view: string;
  target?: string;
  ability?: string;
  item?: string;
};
export function buildIndex(): Result[] {
  const out: Result[] = [];
  const add = (r: Result) => {
    if (r.name && r.text)
      out.push({ ...r, text: r.text.replace(/\s+/g, " ").trim() });
  };
  for (const chapter of document.querySelectorAll<HTMLElement>(
    ".system-rule-chapter[id]",
  ))
    add({
      type: "Правила",
      name: chapter.querySelector("summary h2")?.textContent?.trim() || "",
      text: chapter.textContent || "",
      view: "rules",
      target: chapter.id,
    });
  try {
    for (const [group, v] of Object.entries(OMEN_DATA))
      for (const a of v.skills)
        add({
          type: "Способность",
          name: a[0],
          text: `${group} ${a[1]} ${a[2]}`,
          view: "abilities",
          ability: a[0],
        });
    for (const [group, v] of Object.entries(VOCATION_DATA))
      for (const a of [v.key, ...v.skills])
        if (a)
          add({
            type: "Способность",
            name: a[0],
            text: `${group} ${a[1]} ${a[2]}`,
            view: "abilities",
            ability: a[0],
          });
    for (const i of SHOP_CATALOG)
      add({
        type: "Предмет",
        name: i.name,
        text: `${i.category} ${i.description} ${i.price} монет`,
        view: "shop",
        item: i.name,
      });
  } catch (e) {
    console.warn("Часть каталога поиска недоступна", e);
  }
  for (const city of document.querySelectorAll<HTMLElement>(
    ".lore-book-city[id],.lore-regional-entry[id]",
  )) {
    const name =
      city
        .querySelector("h2,summary span")
        ?.childNodes[0]?.textContent?.trim() || "";
    add({
      type: "Хроника",
      name,
      text: city.textContent || "",
      view: "lore",
      target: city.id,
    });
    for (const part of city.querySelectorAll<HTMLElement>(".lore-book-part")) {
      const title = part.querySelector("summary")?.textContent?.trim() || "";
      if (title)
        add({
          type: "Хроника · " + name,
          name: title,
          text: part.textContent || "",
          view: "lore",
          target: part.id || city.id,
        });
    }
  }
  return out;
}
export function goResult(r: Result) {
  openView(r.view, r.target);
  if (r.ability) {
    const t = document.querySelector<HTMLSelectElement>("#portal-ability-type"),
      g = document.querySelector<HTMLSelectElement>("#portal-ability-group"),
      q = document.querySelector<HTMLInputElement>("#portal-ability-search");
    if (t) t.value = "";
    if (g) g.value = "";
    if (q) {
      q.value = r.ability;
      q.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else if (r.item) {
    const c = document.querySelector<HTMLSelectElement>("#shop-category"),
      q = document.querySelector<HTMLInputElement>("#shop-search");
    if (c) {
      c.value = "";
      c.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (q) {
      q.value = r.item;
      q.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}
