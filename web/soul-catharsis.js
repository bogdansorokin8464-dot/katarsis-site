(() => {
  'use strict';

  const fields = [...document.querySelectorAll('[contenteditable="true"]')];
  const updateEmptyState = (field) => {
    field.dataset.empty = field.textContent.trim() ? 'false' : 'true';
  };

  fields.forEach((field) => {
    updateEmptyState(field);
    field.addEventListener('input', () => updateEmptyState(field));
    field.addEventListener('keydown', (event) => {
      if (field.getAttribute('aria-multiline') === 'false' && event.key === 'Enter') {
        event.preventDefault();
      }
    });
  });

  document.querySelector('[data-print]')?.addEventListener('click', async () => {
    try {
      await document.fonts?.ready;
    } catch {
      // The system fonts are enough to print if the brand font cannot load.
    }
    window.print();
  });

  document.querySelector('[data-clear-fields]')?.addEventListener('click', () => {
    if (!fields.some((field) => field.textContent.trim())) return;
    if (!window.confirm('Очистить весь введённый текст на обеих сторонах карточек?')) return;
    fields.forEach((field) => {
      field.replaceChildren();
      updateEmptyState(field);
    });
    fields[0]?.focus();
  });
})();
