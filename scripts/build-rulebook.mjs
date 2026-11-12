import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const sourcePath = path.join(root, 'web/play/index.html');
const source = await readFile(sourcePath, 'utf8');
const worker = await readFile(path.join(root, 'src/worker.mjs'), 'utf8');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attributesFrom(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    if (match[1] !== tag.match(/^<\/?([\w:-]+)/)?.[1]) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    }
  }
  return attributes;
}

function findElement(html, predicate, from = 0) {
  const openingTags = /<[a-z][\w:-]*\b[^>]*>/gi;
  openingTags.lastIndex = from;
  let match;
  while ((match = openingTags.exec(html))) {
    if (/^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(match[0])) continue;
    if (predicate(match[0])) return {tag: match[0].match(/^<([\w:-]+)/)?.[1]?.toLowerCase(), start: match.index, openEnd: openingTags.lastIndex, opening: match[0]};
  }
  return null;
}

function findMatchingEnd(html, start, tagName) {
  const tags = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tags.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tags.exec(html))) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return tags.lastIndex;
    } else if (!/\/>$/.test(match[0])) {
      depth += 1;
    }
  }
  throw new Error(`Не найден закрывающий тег </${tagName}>`);
}

function extractById(html, id, expectedTag = null) {
  const found = findElement(html, (opening) => {
    const attrs = attributesFrom(opening);
    return attrs.id === id && (!expectedTag || opening.startsWith(`<${expectedTag}`));
  });
  if (!found) throw new Error(`Не найден элемент #${id}`);
  return html.slice(found.start, findMatchingEnd(html, found.start, found.tag));
}

function extractByClass(html, className, expectedTag = null) {
  const found = findElement(html, (opening) => {
    const attrs = attributesFrom(opening);
    return attrs.class?.split(/\s+/).includes(className) && (!expectedTag || opening.startsWith(`<${expectedTag}`));
  });
  if (!found) throw new Error(`Не найден элемент .${className}`);
  return html.slice(found.start, findMatchingEnd(html, found.start, found.tag));
}

function replaceElement(html, predicate, replacement, from = 0) {
  const found = findElement(html, predicate, from);
  if (!found) return html;
  const end = findMatchingEnd(html, found.start, found.tag);
  return html.slice(0, found.start) + replacement + html.slice(end);
}

function removeById(html, id) {
  return replaceElement(html, (opening) => attributesFrom(opening).id === id, '');
}

function removeByClass(html, className) {
  let result = html;
  while (true) {
    const next = replaceElement(result, (opening) => attributesFrom(opening).class?.split(/\s+/).includes(className), '');
    if (next === result) return result;
    result = next;
  }
}

function removeTags(html, tagName) {
  const expression = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return html.replace(expression, '');
}

function extractJsLiteral(name) {
  const declaration = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`, 'g');
  const match = declaration.exec(source);
  if (!match) throw new Error(`Не найден каталог ${name}`);
  const start = declaration.lastIndex;
  const first = source[start];
  if (first !== '{' && first !== '[') throw new Error(`Каталог ${name} не является JSON-подобным литералом`);

  const closing = [];
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === '{') {
      closing.push('}');
    } else if (character === '[') {
      closing.push(']');
    } else if (character === '}' || character === ']') {
      if (closing.pop() !== character) throw new Error(`Повреждён каталог ${name}`);
      if (closing.length === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error(`Не завершён каталог ${name}`);
}

function decodeEntities(text) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&ndash;', '–')
    .replaceAll('&mdash;', '—')
    .replaceAll('&hellip;', '…')
    .replaceAll('&rarr;', '→')
    .replaceAll('&larr;', '←')
    .replaceAll('&middot;', '·');
}

function textOnly(html) {
  return decodeEntities(html.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function getChapterIndex(rules) {
  const result = [];
  const expression = /<details\b(?=[^>]*\bclass="[^"]*\bsystem-rule-chapter\b[^"]*")(?=[^>]*\bid="([^"]+)")[^>]*>/gi;
  let match;
  while ((match = expression.exec(rules))) {
    const start = match.index;
    const end = findMatchingEnd(rules, start, 'details');
    const chapter = rules.slice(start, end);
    const heading = chapter.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '';
    const number = textOnly(heading.match(/<small\b[^>]*>([\s\S]*?)<\/small>/i)?.[1] ?? '').match(/^\d+/)?.[0] ?? String(result.length + 1).padStart(2, '0');
    const title = textOnly(heading.replace(/<small\b[^>]*>[\s\S]*?<\/small>/i, ''));
    result.push({id: match[1], number, title});
    expression.lastIndex = end;
  }
  return result;
}

function openingWithClass(opening, className) {
  const attrs = attributesFrom(opening);
  return attrs.class?.split(/\s+/).includes(className) ?? false;
}

function displayText(value) {
  return String(value ?? '').split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replaceAll('\n', '<br>')}</p>`).join('');
}

function renderAbility(name, cost, description, sourceLabel, type) {
  const search = `${name} ${cost} ${description} ${sourceLabel}`.toLocaleLowerCase('ru');
  return `<article class="book-ability-card" data-search="${escapeHtml(search)}" data-source-type="${type}"><span class="book-card-source">${escapeHtml(sourceLabel)}</span><h4>${escapeHtml(name)}</h4><p class="book-ability-cost">${escapeHtml(cost)}</p><div class="book-ability-copy">${displayText(description)}</div></article>`;
}

function pluralForm(value, forms) {
  const number = Math.abs(Number(value));
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  const last = number % 10;
  return last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
}

function renderAbilityFamilies(omens, vocations) {
  const groups = [];
  for (const [name, data] of Object.entries(omens)) {
    const cards = data.skills.map(([ability, cost, description]) => renderAbility(ability, cost, description, `Знамение · ${name}`, 'Знамение')).join('');
    groups.push(`<details class="book-family" open><summary><span class="book-family-type">ЗНАМЕНИЕ</span><h3>${escapeHtml(name)}</h3><span class="book-family-count">${data.skills.length} ${pluralForm(data.skills.length, ['умение', 'умения', 'умений'])}</span></summary><div class="book-family-body"><p class="book-family-bonus"><b>Покровитель:</b> ${escapeHtml(data.god)}. <b>Особенность:</b> ${escapeHtml(data.bonus)}</p><div class="book-card-grid">${cards}</div></div></details>`);
  }
  for (const [name, data] of Object.entries(vocations)) {
    const key = data.key ? renderAbility(data.key[0], data.key[1], data.key[2], `Ключ призвания · ${name}`, 'Ключ призвания') : '';
    const cards = data.skills.map(([ability, cost, description]) => renderAbility(ability, cost, description, `Призвание · ${name}`, 'Призвание')).join('');
    groups.push(`<details class="book-family" open><summary><span class="book-family-type">ПРИЗВАНИЕ</span><h3>${escapeHtml(name)}</h3><span class="book-family-count">${data.key ? 'Ключ · ' : ''}${data.skills.length} ${pluralForm(data.skills.length, ['умение', 'умения', 'умений'])}</span></summary><div class="book-family-body">${key ? `<div class="book-card-grid book-key-grid">${key}</div>` : ''}<div class="book-card-grid">${cards}</div></div></details>`);
  }
  return groups.join('\n');
}

function pluralCoins(value) {
  const number = Math.abs(Number(value));
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'монет';
  const last = number % 10;
  return last === 1 ? 'монета' : last >= 2 && last <= 4 ? 'монеты' : 'монет';
}

function renderEquipment(catalog) {
  const categories = new Map();
  for (const item of catalog) {
    const category = item.category || 'Прочее';
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(item);
  }
  const options = [...categories.keys()].map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  const sections = [...categories.entries()].map(([category, items], index) => {
    const cards = items.map((item) => {
      const search = `${item.name} ${item.category} ${item.price} ${item.description}`.toLocaleLowerCase('ru');
      return `<article class="book-gear-item" data-category="${escapeHtml(category)}" data-search="${escapeHtml(search)}"><div class="book-gear-heading"><h4>${escapeHtml(item.name)}</h4><span class="book-gear-price">${escapeHtml(item.price)} ${pluralCoins(item.price)}</span></div><p class="book-card-source">${escapeHtml(category)}</p><p>${escapeHtml(item.description).replaceAll('\n', '<br>')}</p></article>`;
    }).join('');
    return `<details class="book-gear-category" id="book-gear-category-${index}" open><summary><h3>${escapeHtml(category)}</h3><span>${items.length} ${pluralForm(items.length, ['предмет', 'предмета', 'предметов'])}</span></summary><div class="book-gear-grid">${cards}</div></details>`;
  }).join('\n');
  return {options, sections, categoryCount: categories.size};
}

function makeRulesBook() {
  let rules = extractById(source, 'view-rules', 'section');
  const ruleLead = textOnly(extractByClass(rules, 'portal-lead', 'p'));
  const checkTools = extractById(rules, 'check-tools', 'section');
  const checkIntro = checkTools.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '';
  const checkSummary = checkTools.match(/<small\b[^>]*>([\s\S]*?)<\/small>/i)?.[1] ?? '';
  const staticCheck = `<div class="sr-example book-static-check"><h3>Проверка по листу персонажа</h3><p>${checkIntro}</p><p>${checkSummary}</p></div>`;
  rules = replaceElement(rules, (opening) => attributesFrom(opening).id === 'check-tools', staticCheck);
  rules = removeByClass(rules, 'portal-eyebrow');
  rules = removeByClass(rules, 'portal-page-title');
  rules = removeByClass(rules, 'portal-lead');
  rules = removeByClass(rules, 'sr-shortcuts');
  rules = removeByClass(rules, 'sr-controls');
  rules = removeByClass(rules, 'uc-calculator');
  rules = removeByClass(rules, 'al-template-section');
  rules = removeByClass(rules, 'cx-controls');
  rules = removeById(rules, 'camp-result');
  rules = rules.replace(/<section\b[^>]*\bid="view-rules"[^>]*>/i, '<section class="book-rule-content" id="book-rules">');
  rules = rules.replace(/<details\b(?![^>]*\bopen(?:\s|=|>))([^>]*)>/gi, '<details$1 open>');
  const remainingControls = [...rules.matchAll(/<(button|input|select|textarea|iframe|form)\b[^>]*>/gi)].map((match) => match[0]);
  if (remainingControls.length) throw new Error(`В статическом рулбуке остались интерактивные элементы правил: ${remainingControls.slice(0, 12).join(' | ')}`);
  return {rules, lead: ruleLead, chapters: getChapterIndex(rules)};
}

function makeLoreBook() {
  let lore = extractById(source, 'view-lore', 'section');
  lore = lore.replace(/<button\b[^>]*data-go="map"[^>]*>[\s\S]*?<\/button>/i, '<a class="book-map-link" href="/play/#map">Открыть интерактивную карту ↗</a>');
  lore = lore.replace(/<button\b[^>]*data-lore-open-place="[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '<a class="book-map-link" href="/play/#map">Открыть на карте ↗</a>');
  lore = removeById(lore, 'lore-book-expand');
  lore = removeById(lore, 'lore-book-collapse');
  lore = removeByClass(lore, 'portal-eyebrow');
  lore = lore.replace(/<h1\b([^>]*)>/i, '<h2$1>').replace(/<\/h1>/i, '</h2>');
  lore = lore.replace(/<section\b[^>]*\bid="view-lore"[^>]*>/i, '<section class="book-world-content" id="book-world-content">');
  lore = lore.replace(/<details\b(?![^>]*\bopen(?:\s|=|>))([^>]*)>/gi, '<details$1 open>');
  if (/<(?:button|input|select|textarea|iframe|form)\b/i.test(lore)) throw new Error('В статическом рулбуке остались интерактивные элементы хроники');
  return lore;
}

function makeCombatCard() {
  const combat = extractById(source, 'view-combat', 'section');
  return extractByClass(combat, 'combat-card', 'article');
}

function getWorkerVersion() {
  const match = worker.match(/const VERSION=\{id:'([^']+)',date:'([^']+)'/);
  if (!match) throw new Error('Не удалось прочитать версию сайта');
  return {id: match[1], date: match[2]};
}

const {rules, lead, chapters} = makeRulesBook();
const omens = extractJsLiteral('OMEN_DATA');
const vocations = extractJsLiteral('VOCATION_DATA');
const catalog = extractJsLiteral('SHOP_CATALOG');
const abilityCount = Object.values(omens).reduce((total, omen) => total + omen.skills.length, 0)
  + Object.values(vocations).reduce((total, vocation) => total + vocation.skills.length + (vocation.key ? 1 : 0), 0);
const equipment = renderEquipment(catalog);
const lore = makeLoreBook();
const combatCard = makeCombatCard();
const version = getWorkerVersion();
const chapterNav = chapters.map(({id, number, title}) => `<a href="#${escapeHtml(id)}"><span>${escapeHtml(number)}</span>${escapeHtml(title)}</a>`).join('\n');
const vocationCount = Object.keys(vocations).length;
const omenCount = Object.keys(omens).length;
const skillCount = 31;
const bookHtml = `<!doctype html>
<html lang="ru" data-rulebook-version="${escapeHtml(version.id)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#33243b">
<meta name="description" content="Полная книга правил настольной ролевой системы Катарсис: создание персонажа, проверки, бой, отдых, способности, снаряжение и хроника мира.">
<meta property="og:type" content="book">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="Катарсис — Книга правил">
<meta property="og:description" content="Полная цифровая книга правил, каталоги способностей и снаряжения, хроника мира.">
<link rel="icon" href="/assets/b38605d34f1d7a647b1aae9d.png">
<link rel="stylesheet" href="/brand-font.css">
<link rel="stylesheet" href="/rulebook.css">
<title>Катарсис — Книга правил</title>
</head>
<body>
<a class="book-skip" href="#book-main">К содержанию книги</a>
<header class="book-topbar">
  <a class="book-brand" href="/" aria-label="Катарсис — главная"><img src="/assets/b38605d34f1d7a647b1aae9d.png" alt="" width="38" height="38"><span>КАТАРСИС<small>КНИГА ПРАВИЛ</small></span></a>
  <nav class="book-topnav" aria-label="Разделы книги"><a href="#book-rules">Правила</a><a href="#book-combat">Бой</a><a href="#book-abilities">Способности</a><a href="#book-equipment">Снаряжение</a><a href="#book-world">Мир</a></nav>
  <div class="book-top-actions"><a class="book-app-link" href="/play/#builder">Играть ↗</a><button class="book-print-button" data-book-print type="button">Печать / PDF</button></div>
</header>
<div class="book-layout">
  <aside class="book-sidebar" aria-label="Подробное содержание">
    <div class="book-sidebar-intro"><span>СОДЕРЖАНИЕ</span><strong>Книга правил</strong><small>${escapeHtml(version.date)} · ${escapeHtml(version.id)}</small></div>
    <nav class="book-sidebar-nav" aria-label="Главы книги">
      <a class="book-nav-part" href="#book-cover"><span>00</span>Начало</a>
      <a class="book-nav-part" href="#book-rules"><span>01</span>Основные правила</a>
      <div class="book-chapter-links">${chapterNav}</div>
      <a class="book-nav-part" href="#book-combat"><span>02</span>Боевая памятка</a>
      <a class="book-nav-part" href="#book-abilities"><span>03</span>Способности</a>
      <a class="book-nav-part" href="#book-equipment"><span>04</span>Снаряжение</a>
      <a class="book-nav-part" href="#book-world"><span>05</span>Мир Катарсиса</a>
    </nav>
    <a class="book-sidebar-cta" href="/play/#builder">Создать персонажа <span>↗</span></a>
  </aside>
  <main class="book-main" id="book-main">
    <details class="book-mobile-toc"><summary>Содержание книги · ${chapters.length} глав</summary><nav aria-label="Содержание книги">${chapterNav}<a href="#book-combat">Боевая памятка</a><a href="#book-abilities">Способности</a><a href="#book-equipment">Снаряжение</a><a href="#book-world">Мир Катарсиса</a></nav></details>
    <section class="book-cover" id="book-cover" aria-labelledby="book-title">
      <div class="book-cover-art" aria-hidden="true"></div>
      <div class="book-cover-copy"><div class="book-kicker"><span></span>Настольная ролевая система</div><p class="book-cover-label">ОСНОВНАЯ КНИГА · ${escapeHtml(version.id)}</p><h1 id="book-title">КАТАРСИС</h1><p class="book-cover-subtitle">Книга правил</p><p class="book-cover-deck">Мир единого Света, опасных дорог и чужих тайн. Создай героя, собери партию — и оставь свою историю.</p>
        <div class="book-cover-stats"><span><b>${chapters.length}</b> глав правил</span><span><b>${skillCount}</b> ${pluralForm(skillCount, ['навык', 'навыка', 'навыков'])}</span><span><b>${omenCount}</b> знамений</span><span><b>${vocationCount}</b> призваний</span><span><b>${abilityCount}</b> способностей</span><span><b>${catalog.length}</b> предметов</span></div>
        <div class="book-cover-actions"><a class="book-button book-button-primary" href="#book-rules">Начать чтение <span>↓</span></a><button class="book-button" data-book-print type="button">Сохранить как PDF</button><a class="book-text-link" href="/play/#builder">Открыть игровой кабинет ↗</a></div>
      </div><div class="book-cover-seal" aria-hidden="true">ВОСЕМЬ<br>ЗНАМЕНИЙ<br><span>ОДНА ИСТОРИЯ</span></div>
      <div class="book-cover-foot"><span>СОБРАНО ИЗ ДЕЙСТВУЮЩИХ МАТЕРИАЛОВ САЙТА</span><span>Сверено: ${escapeHtml(version.date)}</span></div>
    </section>
    <section class="book-intro" aria-labelledby="book-intro-title"><div class="book-section-eyebrow">Перед первым броском</div><h2 id="book-intro-title">Как пользоваться книгой</h2><p>Эта книга собирает в одном месте правила системы, практическую памятку боя, полный каталог умений и предметов и хронику мира. Тексты правил, способности, цены и описания перенесены из игрового кабинета; новые игровые механики здесь не добавляются.</p><div class="book-intro-grid"><article><span>01</span><h3>Сначала — основа</h3><p>Прочитай первые главы о персонаже, проверках и ресурсах; затем переходи к правилам боя.</p></article><article><span>02</span><h3>Справочник рядом</h3><p>Найди все умения и снаряжение в приложениях. Поиск работает по названиям, описаниям и источникам.</p></article><article><span>03</span><h3>За столом важнее ясность</h3><p>Если правило прямо оставляет решение Мастеру, обсудите его до броска. Неопределённые пункты собраны в главе о границах справочника.</p></article></div><div class="book-intro-actions"><a href="/play/#builder">Создать персонажа ↗</a><a href="/play/#map">Открыть карту мира ↗</a><a href="/play/#rules">Игровой справочник ↗</a></div></section>
    <section class="book-part book-rules-part" aria-labelledby="book-rules-heading"><header class="book-part-heading"><div class="book-section-eyebrow">Часть первая · система</div><h2 id="book-rules-heading">Правила системы</h2><p>${escapeHtml(lead)}</p></header>${rules}</section>
    <section class="book-part book-combat-part" id="book-combat" aria-labelledby="book-combat-heading"><header class="book-part-heading"><div class="book-section-eyebrow">Практическая памятка</div><h2 id="book-combat-heading">Бой за столом</h2><p>Короткая последовательность хода и ключевые пороги боя из памятки игрока. Подробные правила и частные случаи см. в главах 14–20.</p></header>${combatCard}<p class="book-source-link"><a href="/play/#combat">Открыть памятку боя в игровом кабинете ↗</a></p></section>
    <section class="book-part book-abilities-part" id="book-abilities" aria-labelledby="book-abilities-heading"><header class="book-part-heading"><div class="book-section-eyebrow">Приложение первое · каталог способностей</div><h2 id="book-abilities-heading">Знамения, призвания и умения</h2><p>Полный каталог действующих описаний: ${omenCount} знамений, ${vocationCount} призваний и ${abilityCount} записей способностей и ключей. Текст карточек сохранён из игрового справочника.</p></header><div class="book-filter-panel"><label for="book-ability-search">Поиск способности</label><input id="book-ability-search" type="search" placeholder="Название, эффект или призвание…"><label for="book-ability-type">Источник</label><select id="book-ability-type"><option value="">Все источники</option><option value="Знамение">Знамения</option><option value="Призвание">Призвания</option><option value="Ключ призвания">Ключи призваний</option></select><p id="book-ability-count" role="status" aria-live="polite">${abilityCount} записей</p></div><div class="book-families">${renderAbilityFamilies(omens, vocations)}</div><p class="book-source-link"><a href="/play/#abilities">Открыть каталог способностей с фильтрами ↗</a></p></section>
    <section class="book-part book-equipment-part" id="book-equipment" aria-labelledby="book-equipment-heading"><header class="book-part-heading"><div class="book-section-eyebrow">Приложение второе · каталог имущества</div><h2 id="book-equipment-heading">Снаряжение</h2><p>${catalog.length} предметов из походной лавки. Цена и описание относятся к записи каталога; дополнительные эффекты, сроки и способы применения действуют только там, где прямо указаны.</p></header><div class="book-filter-panel book-gear-filters"><label for="book-gear-search">Поиск предмета</label><input id="book-gear-search" type="search" placeholder="Название, категория или описание…"><label for="book-gear-category">Категория</label><select id="book-gear-category"><option value="">Все категории</option>${equipment.options}</select><p id="book-gear-count" role="status" aria-live="polite">${catalog.length} предметов · ${equipment.categoryCount} категорий</p></div><div class="book-gear-catalog">${equipment.sections}</div><p class="book-source-link"><a href="/play/#shop">Открыть интерактивную лавку ↗</a></p></section>
    <section class="book-part book-world-part" id="book-world" aria-labelledby="book-world-heading"><header class="book-part-heading"><div class="book-section-eyebrow">Приложение третье · хроника и места</div><h2 id="book-world-heading">Мир Катарсиса</h2><p>История, единый Свет, города и региональные хроники. Материал приведён в том виде, в каком он представлен в справочнике мира; неизвестные причины и нерешённые детали остаются неизвестными.</p><p class="book-source-link"><a href="/play/#map">Открыть интерактивную карту с поселениями ↗</a></p></header>${lore}</section>
    <footer class="book-footer"><a class="book-brand" href="/"><img src="/assets/b38605d34f1d7a647b1aae9d.png" alt="" width="34" height="34"><span>КАТАРСИС<small>Книга правил</small></span></a><p>Правила дают опору. Историю создаёте вы.</p><div><a href="/play/#builder">Создать героя</a><a href="/play/#session">За столом</a><a href="/">На главную</a></div><small>Сверено с сайтом: ${escapeHtml(version.date)} · ${escapeHtml(version.id)}</small></footer>
  </main>
</div>
<script src="/rulebook.js" defer></script>
</body>
</html>`;

if (chapters.length !== 25) throw new Error(`Ожидалось 25 глав правил, найдено ${chapters.length}`);
if (abilityCount !== 212) throw new Error(`Ожидалось 212 способностей и ключей, найдено ${abilityCount}`);
if (catalog.length !== 439) throw new Error(`Ожидалось 439 предметов снаряжения, найдено ${catalog.length}`);
if ((rules.match(/class="book-ability-card"/g) ?? []).length !== 0) throw new Error('В правилах случайно оказался каталог способностей');
if (/<(?:button|input|select|textarea|iframe|form)\b/i.test(combatCard)) throw new Error('В боевой памятке остались элементы управления');

const destination = path.join(root, 'web/rulebook/index.html');
await mkdir(path.dirname(destination), {recursive: true});
await writeFile(destination, bookHtml);
console.log(`Книга правил собрана: ${destination} · ${chapters.length} глав · ${abilityCount} способностей · ${catalog.length} предметов · ${Buffer.byteLength(bookHtml)} байт`);
