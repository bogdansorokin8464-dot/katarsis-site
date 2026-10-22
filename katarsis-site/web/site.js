(()=>{'use strict';
const CURRENT='2026.10.22.4',$=id=>document.getElementById(id);
const menu=document.querySelector('.menu-toggle');if(menu)menu.onclick=()=>{const open=document.getElementById('main-nav').classList.toggle('open');menu.setAttribute('aria-expanded',String(open));};
const search=$('section-search');if(search)search.addEventListener('input',()=>{const q=search.value.toLocaleLowerCase('ru').trim();let visible=0;document.querySelectorAll('[data-search]').forEach(c=>{c.hidden=!c.dataset.search.includes(q);if(!c.hidden)visible++;});$('search-empty').hidden=visible>0;});
let offered=false;
async function checkVersion(){if(document.hidden||offered)return;try{const r=await fetch('/api/version',{cache:'no-store'});if(!r.ok)return;const v=await r.json();if(v.id===CURRENT)return;offered=true;const box=document.createElement('aside');box.className='update-banner';box.setAttribute('role','status');const text=document.createElement('div');text.textContent='Доступна новая версия Катарсиса. Обновить сайт?';const apply=document.createElement('button');apply.className='button small';apply.textContent='Сохранить и обновить';apply.onclick=()=>{try{window.KATAR_PORTAL?.save();}catch{}location.reload();};const later=document.createElement('button');later.className='button secondary small';later.textContent='Позже';later.onclick=()=>box.remove();box.append(text,apply,later);document.body.append(box);}catch{}}
checkVersion();setInterval(checkVersion,60000);document.addEventListener('visibilitychange',checkVersion);
})();
