/* Focus the app content without replacing its route hash. */
(()=>{const link=document.querySelector('.interface-skip'),main=document.getElementById('portal-content');if(link&&main)link.addEventListener('click',e=>{e.preventDefault();main.focus({preventScroll:true});main.scrollIntoView({block:'start',behavior:'instant'});});})();
