/* Multi-language picker; existing identity field remains the save format. */
(()=>{
'use strict';
const languages=['Общий','Рейгшальский','Юглатан','Церковный','Вальденский','Ронгелстский','Меридарский','Сольвернский'];
const input=document.getElementById('portal-languages');
const field=document.querySelectorAll('.ident-l .line')[3];
const openButton=document.getElementById('languages-open');
const dialog=document.getElementById('languages-dialog');
const list=document.getElementById('languages-list');
const summary=document.getElementById('languages-selection');
if(!input||!field||!dialog)return;
let invoker=null;
const normalize=s=>s.trim().toLocaleLowerCase('ru').replaceAll('ё','е');
function selected(){
 const known=new Map(languages.map(n=>[normalize(n),n]));
 return [...new Set(field.textContent.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).map(s=>known.get(normalize(s))||s))];
}
function render(){
 const focused=list.contains(document.activeElement)?document.activeElement.value:null;
 const chosen=selected(),names=[...languages,...chosen.filter(n=>!languages.includes(n))];
 list.replaceChildren();
 for(const name of names){
  const label=document.createElement('label');label.className='language-option';
  const box=document.createElement('input');box.type='checkbox';box.value=name;box.checked=chosen.includes(name);
  const text=document.createElement('span');text.textContent=name;
  if(!languages.includes(name)){const legacy=document.createElement('small');legacy.textContent='Из прежнего сохранения';text.append(legacy);}
  label.append(box,text);list.append(label);
  box.onchange=()=>{
   const values=[...list.querySelectorAll('input:checked')].map(n=>n.value);
   input.value=values.join(', ');input.dispatchEvent(new Event('input',{bubbles:true}));
   summary.textContent=values.length?values.join(' · '):'Языки пока не выбраны';
   document.getElementById('languages-count').textContent='Выбрано: '+values.length;
   window.KATAR_PORTAL?.save(true);
  };
 }
 summary.textContent=chosen.length?chosen.join(' · '):'Языки пока не выбраны';
 openButton.textContent=chosen.length?'Изменить языки ('+chosen.length+')':'Выбрать языки';
 document.getElementById('languages-count').textContent='Выбрано: '+chosen.length;
 input.value=field.textContent;
 if(focused&&dialog.open)[...list.querySelectorAll('input')].find(n=>n.value===focused)?.focus();
}
function open(from){render();invoker=from;if(!dialog.open)dialog.showModal();list.querySelector('input')?.focus();}
openButton.onclick=()=>open(openButton);
field.contentEditable='false';field.setAttribute('role','button');field.setAttribute('tabindex','0');field.setAttribute('aria-haspopup','dialog');field.setAttribute('aria-label','Языки: выбрать из списка');field.title='Нажмите, чтобы выбрать известные языки';field.classList.add('language-sheet-field');
field.addEventListener('click',()=>open(field));
field.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(field);}});
document.getElementById('languages-done').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{render();invoker?.focus();});
new MutationObserver(render).observe(field,{childList:true,subtree:true,characterData:true});
field.addEventListener('input',render);
render();
})();
