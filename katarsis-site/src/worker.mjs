const VERSION={id:'2026.10.24.2',date:'24 октября 2026',title:'Новая обложка и оформление главной страницы'};
const ROUTES=new Map([
 ['/', '/index.html'],['/play','/play/index.html'],['/play/','/play/index.html'],['/play/index.html','/play/index.html'],
 ['/gm','/gm.html'],['/gm/','/gm.html'],['/updates','/updates.html'],
 ['/gm/tools','/build/materials/core.html'],
 ['/home.css','/home.css'],['/site.css','/site.css'],['/site.js','/site.js'],['/online.css','/online.css'],['/online.js','/online.js'],['/brand-font.css','/brand-font.css'],['/master-nav.js','/master-nav.js'],['/private-session.js','/master-nav.js'],['/robots.txt','/robots.txt']
]);
function headers(response,{asset=false}={}){
 const h=new Headers(response.headers);
 h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','same-origin');h.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');h.set('X-Frame-Options','SAMEORIGIN');
 h.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
 h.set('Cache-Control',asset?'public, max-age=31536000, immutable':'no-cache');
 return new Response(response.body,{status:response.status,headers:h});
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','HEAD'].includes(request.method))return headers(new Response('Метод не поддерживается',{status:405,headers:{Allow:'GET, HEAD'}}));
 if(path==='/login')return new Response(null,{status:302,headers:{Location:'/gm','Cache-Control':'no-store'}});
 if(path==='/api/version')return headers(Response.json(VERSION));
 if(path==='/api/session')return headers(Response.json({openAccess:true,authenticationRequired:false}));
 const target=ROUTES.get(path)||(/^\/assets\/[a-f0-9]{24}\.(png|jpg|webp|svg|ttf|woff2?|pdf|bin)$/.test(path)?path:null);
 if(!target)return headers(new Response('Страница не найдена',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}}));
 const destination=new URL(request.url);destination.pathname=target;destination.search='';
 const clean=new Headers(request.headers);clean.delete('cookie');clean.delete('authorization');
 const result=await env.ASSETS.fetch(new Request(destination,{method:request.method,headers:clean}));
 const response=headers(result,{asset:target.startsWith('/assets/')});
 return response;
}};
