import './prepare-assets.mjs';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const source=new URL('../../',import.meta.url),target=new URL('../web/build/materials/',import.meta.url);
await mkdir(target,{recursive:true});

for(const[name,out]of [['КАТАРСИС.html','core.html']]){
 let text=await readFile(new URL(encodeURIComponent(name),source),'utf8');
 // The standalone master source keeps its embedded map. In the published GM copy,
 // serve that same image as a hashed static asset to stay below Cloudflare's per-file limit.
 let externalizedMap=0;
 const mapPattern=/(<img\b[^>]*?id="world-map-image"[^>]*?src=")data:image\/webp;base64,([A-Za-z0-9+/=]+)(")/;
 text=text.replace(mapPattern,(_match,before,payload,after)=>{
  externalizedMap++;
  const hash=createHash('sha256').update(Buffer.from(payload,'base64')).digest('hex').slice(0,24);
  return `${before}/assets/${hash}.webp${after}`;
 });
 if(externalizedMap!==1)throw new Error(`Ожидалось одно встроенное изображение карты; найдено: ${externalizedMap}`);
 text=text.replace('if(saved)restore(JSON.parse(saved),false).catch','if(saved)restore(JSON.parse(saved),false).then(()=>{if(requestedInitialView)showView(requestedInitialView);}).catch').replace("let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;","const requestedInitialView=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'';let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;");
 await writeFile(new URL(out,target),text.replace('</body>','<script src="/master-nav.js" defer></script></body>'));
}

// Keep the source helper for later; omit it from published assets.
await rm(new URL('lipotaktis.html',target),{force:true});

// Remove any leftover adventure handouts from previous builds.
await rm(new URL('handouts.pdf',target),{force:true});
