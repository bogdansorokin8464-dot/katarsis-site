import './prepare-assets.mjs';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
const source=new URL('../../',import.meta.url),target=new URL('../web/build/materials/',import.meta.url);await mkdir(target,{recursive:true});
for(const[name,out]of [['КАТАРСИС.html','core.html']]){
 let text=await readFile(new URL(encodeURIComponent(name),source),'utf8');text=text.replace('if(saved)restore(JSON.parse(saved),false).catch','if(saved)restore(JSON.parse(saved),false).then(()=>{if(requestedInitialView)showView(requestedInitialView);}).catch').replace("let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;","const requestedInitialView=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'';let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;");await writeFile(new URL(out,target),text.replace('</body>','<script src="/master-nav.js" defer></script></body>'));
}

// Keep the source helper for later; omit it from published assets.
await rm(new URL('lipotaktis.html',target),{force:true});

// Remove any leftover adventure handouts from previous builds.
await rm(new URL('handouts.pdf',target),{force:true});
