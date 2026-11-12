(() => {
  'use strict';

  const print = () => {
    if (document.fonts?.ready) document.fonts.ready.then(() => window.print()).catch(() => window.print());
    else window.print();
  };

  document.querySelectorAll('[data-screen-print]').forEach((button) => {
    button.addEventListener('click', print);
  });

  if (new URLSearchParams(location.search).has('print')) {
    window.addEventListener('load', () => setTimeout(print, 120), {once: true});
  }
})();
