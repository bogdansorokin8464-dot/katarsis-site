(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('ru');
  const pluralForm = (value, forms) => {
    const number = Math.abs(Number(value));
    const lastTwo = number % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
    const last = number % 10;
    return last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
  };

  document.querySelectorAll('[data-book-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });

  const abilitySearch = byId('book-ability-search');
  const abilityType = byId('book-ability-type');
  const abilityCount = byId('book-ability-count');
  const abilityCards = [...document.querySelectorAll('.book-ability-card')];
  const abilityFamilies = [...document.querySelectorAll('.book-family')];

  function filterAbilities() {
    if (!abilitySearch || !abilityType || !abilityCount) return;
    const query = normalize(abilitySearch.value);
    const type = abilityType.value;
    let visible = 0;
    for (const card of abilityCards) {
      const text = normalize(card.dataset.search || card.textContent);
      const matches = (!query || text.includes(query)) && (!type || card.dataset.sourceType === type);
      card.hidden = !matches;
      if (matches) visible += 1;
    }
    for (const family of abilityFamilies) {
      const hasResults = family.querySelector('.book-ability-card:not([hidden])') !== null;
      family.hidden = !hasResults;
      if ((query || type) && hasResults) family.open = true;
    }
    abilityCount.textContent = `${visible} из ${abilityCards.length} записей`;
  }

  abilitySearch?.addEventListener('input', filterAbilities);
  abilityType?.addEventListener('change', filterAbilities);

  const gearSearch = byId('book-gear-search');
  const gearCategory = byId('book-gear-category');
  const gearCount = byId('book-gear-count');
  const gearCards = [...document.querySelectorAll('.book-gear-item')];
  const gearSections = [...document.querySelectorAll('.book-gear-category')];

  function filterEquipment() {
    if (!gearSearch || !gearCategory || !gearCount) return;
    const query = normalize(gearSearch.value);
    const category = gearCategory.value;
    let visible = 0;
    for (const card of gearCards) {
      const matches = (!query || normalize(card.dataset.search || card.textContent).includes(query))
        && (!category || card.dataset.category === category);
      card.hidden = !matches;
      if (matches) visible += 1;
    }
    for (const section of gearSections) {
      const hasResults = section.querySelector('.book-gear-item:not([hidden])') !== null;
      section.hidden = !hasResults;
      if ((query || category) && hasResults) section.open = true;
    }
    gearCount.textContent = `${visible} из ${gearCards.length} ${pluralForm(gearCards.length, ['предмет', 'предмета', 'предметов'])}`;
  }

  gearSearch?.addEventListener('input', filterEquipment);
  gearCategory?.addEventListener('change', filterEquipment);

  let printOpenState = [];
  let printFilterState = null;
  window.addEventListener('beforeprint', () => {
    printOpenState = [...document.querySelectorAll('details')].map((details) => [details, details.open]);
    printFilterState = {
      abilityQuery: abilitySearch?.value ?? '',
      abilityType: abilityType?.value ?? '',
      gearQuery: gearSearch?.value ?? '',
      gearCategory: gearCategory?.value ?? '',
    };
    if (abilitySearch) abilitySearch.value = '';
    if (abilityType) abilityType.value = '';
    if (gearSearch) gearSearch.value = '';
    if (gearCategory) gearCategory.value = '';
    filterAbilities();
    filterEquipment();
    document.querySelectorAll('details').forEach((details) => { details.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (printFilterState) {
      if (abilitySearch) abilitySearch.value = printFilterState.abilityQuery;
      if (abilityType) abilityType.value = printFilterState.abilityType;
      if (gearSearch) gearSearch.value = printFilterState.gearQuery;
      if (gearCategory) gearCategory.value = printFilterState.gearCategory;
      filterAbilities();
      filterEquipment();
    }
    for (const [details, wasOpen] of printOpenState) details.open = wasOpen;
    printOpenState = [];
    printFilterState = null;
  });
})();
