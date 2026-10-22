import './prepare-assets.mjs';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const source=new URL('../../',import.meta.url),target=new URL('../web/build/materials/',import.meta.url);await mkdir(target,{recursive:true});
for(const[name,out]of [['КАТАРСИС.html','core.html'],['Липотактис — помощник Мастера.html','lipotaktis.html']]){
 let text=await readFile(new URL(encodeURIComponent(name),source),'utf8');text=text.replace('if(saved)restore(JSON.parse(saved),false).catch','if(saved)restore(JSON.parse(saved),false).then(()=>{if(requestedInitialView)showView(requestedInitialView);}).catch').replace("let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;","const requestedInitialView=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'';let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;");await writeFile(new URL(out,target),text.replace('</body>','<script src="/master-nav.js" defer></script></body>'));
}
await copyFile(new URL(encodeURIComponent('Липотактис — вся раздатка.pdf'),source),new URL('handouts.pdf',target));console.log('Открытые материалы Мастера собраны. Вход и пароль не требуются.');
