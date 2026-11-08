import './prepare-assets.mjs';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const source=new URL('../',import.meta.url),target=new URL('../web/build/materials/',import.meta.url);
const assets=new URL('../web/assets/',import.meta.url);
await mkdir(target,{recursive:true});

for(const[name,out]of [['КАТАРСИС.html','core.html']]){
 let text=await readFile(new URL(encodeURIComponent(name),source),'utf8');
 // The standalone file keeps its embedded map. In the published GM copy the same
 // image is served as a static asset, otherwise core.html exceeds Cloudflare's
 // 25 MiB per-file limit.
 let mapPayload=null,mapName='';
 const mapPattern=/(<img\b[^>]*?id="world-map-image"[^>]*?src=")data:image\/webp;base64,([A-Za-z0-9+/=]+)(")/;
 let externalizedMap=0;
 text=text.replace(mapPattern,(_match,before,payload,after)=>{
  externalizedMap++;
  mapPayload=Buffer.from(payload,'base64');
  mapName=createHash('sha256').update(mapPayload).digest('hex').slice(0,24)+'.webp';
  return `${before}/assets/${mapName}${after}`;
 });
 if(externalizedMap!==1)throw new Error(`Ожидалось одно встроенное изображение карты; найдено: ${externalizedMap}`);
 if(mapPayload){
  await mkdir(assets,{recursive:true});
  await writeFile(new URL(mapName,assets),mapPayload);
 }
 text=text.replace('if(saved)restore(JSON.parse(saved),false).catch','if(saved)restore(JSON.parse(saved),false).then(()=>{if(requestedInitialView)showView(requestedInitialView);}).catch').replace("let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;","const requestedInitialView=Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):'';let view='home',step=0,restoring=false,saveTimer=null,toastTimer=null;");
 text=text.replace('</body>','<script src="/master-nav.js" defer></script></body>');
 const bytes=Buffer.byteLength(text);
 if(bytes>25*1024*1024)throw new Error(`core.html превышает лимит Cloudflare: ${bytes} байт`);
 await writeFile(new URL(out,target),text);
}

// Keep the source helper for later; omit it from published assets.
await rm(new URL('lipotaktis.html',target),{force:true});

// Remove any leftover adventure handouts from previous builds.
await rm(new URL('handouts.pdf',target),{force:true});
