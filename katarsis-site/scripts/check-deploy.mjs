const base=process.argv[2];if(!base||!/^https:\/\//.test(base)){console.error('Usage: node scripts/check-deploy.mjs https://YOUR-SITE.workers.dev');process.exit(1);}
const origin=new URL(base).origin;let failed=0;
for(const path of ['/','/play/','/api/version','/gm','/gm/adventure','/gm/tools','/gm/handouts.pdf']){const r=await fetch(origin+path);console.log(r.status===200?'PASS':'FAIL',path,r.status);if(r.status!==200)failed++;}
process.exitCode=failed?1:0;
