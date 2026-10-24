import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export function publicAddress(address){
 if(isIP(address)===4){const [a,b,c]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));}
 return isIP(address)===6&&/^[23]/i.test(address)&&!/^2002:|^2001:(db8|0*0:)/i.test(address);
}
export function publicUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!isIP(u.hostname.replace(/[\[\]]/g,''))&&u.hostname.includes('.')&&!/\.(localhost|local|internal|test)$/i.test(u.hostname);}catch{return false;}}

// Resolve each redirect and pin the checked address for the actual TLS connection.
export async function readPublicPage(value,{accept='text/html,text/plain,application/xhtml+xml',redirects=0}={}){
 if(!publicUrl(value)||redirects>4)throw Error('Enlace no permitido.');
 const url=new URL(value),addresses=await lookup(url.hostname,{all:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Dirección no pública.');
 const address=addresses[0];
 const response=await new Promise((resolve,reject)=>{
  const req=https.get(url,{autoSelectFamily:false,lookup:(_hostname,_options,callback)=>callback(null,address.address,address.family),signal:AbortSignal.timeout(12000),headers:{Accept:accept,'User-Agent':'MiDiario/1.0 (personal project documentation reader)','Accept-Encoding':'identity'}},res=>{
   if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
   if(res.statusCode!==200){res.resume();reject(Error('Documentación no disponible.'));return;}
   if(!/^(text\/|application\/(json|xhtml|vnd\.github))/i.test(res.headers['content-type']||'')){res.resume();reject(Error('Formato de documentación no compatible.'));return;}
   let size=0;const chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>1500000){res.destroy();reject(Error('Documento demasiado grande.'));}else chunks.push(chunk);});
   res.on('end',()=>resolve({body:Buffer.concat(chunks).toString('utf8'),url:url.href,contentType:res.headers['content-type']||''}));res.on('error',reject);
  });req.on('error',reject);
 });
 if(response.redirect)return readPublicPage(new URL(response.redirect,url).href,{accept,redirects:redirects+1});
 return response;
}
function plain(value){return value.replace(/<(script|style|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();}
export function projectText(page){
 if(!/html/i.test(page.contentType))return page.body.replace(/```[\s\S]*?```/g,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').slice(0,20000).trim();
 const cleaned=page.body.replace(/<(script|style|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const body=(cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||cleaned;
 const parts=[...body.matchAll(/<(h[1-4]|p|li|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>plain(m[2])).filter(p=>p.length>12&&!/accept all cookies|all rights reserved|sign in to github/i.test(p));
 return [...new Set(parts)].join('\n').slice(0,20000)||plain(body).slice(0,20000);
}
function documentationLinks(page){
 const base=new URL(page.url),links=[];
 for(const match of page.body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  try{const u=new URL(match[1],base);u.hash='';if(u.origin===base.origin&&u.pathname!==base.pathname&&publicUrl(u.href)&&/\b(docs?|documentation|readme|getting.started|overview|features)\b/i.test(u.pathname+' '+plain(match[2]))&&!/\.(pdf|zip|exe|dmg)$/i.test(u.pathname))links.push(u.href);}catch{}
 }
 return [...new Set(links)].slice(0,2);
}
export async function projectContent(article,read=readPublicPage){
 const documents=[];
 const add=page=>{const body=projectText(page);if(body.length>=100)documents.push({url:page.url,text:body});};
 try{
  const u=new URL(article.url),repo=u.hostname==='github.com'?u.pathname.match(/^\/([\w.-]+)\/([\w.-]+)/):null;
  if(repo){
   const owner=repo[1],name=repo[2].replace(/\.git$/,'');
   for(const endpoint of [`https://api.github.com/repos/${owner}/${name}/readme`,`https://raw.githubusercontent.com/${owner}/${name}/main/README.md`,`https://raw.githubusercontent.com/${owner}/${name}/master/README.md`]){
    try{add(await read(endpoint,{accept:'application/vnd.github.raw+json,text/plain'}));if(documents.length)break;}catch{}
   }
  }else{
   const page=await read(article.url);add(page);
   for(const link of documentationLinks(page)){try{add(await read(link));}catch{}}
  }
 }catch{}
 // The creator's submission can explain projects whose site requires JavaScript.
 if(documents.length===0&&article.discussionUrl){
  const id=new URL(article.discussionUrl).searchParams.get('id');
  if(/^\d+$/.test(id||'')){try{const page=await read('https://hn.algolia.com/api/v1/items/'+id);const story=JSON.parse(page.body);if(story.text&&plain(story.text).length>=100)documents.push({url:article.discussionUrl,text:plain(story.text).slice(0,18000)});}catch{}}
 }
 if(!documents.length)return null;
 return {basis:'documentation',text:documents.map(d=>'FUENTE: '+d.url+'\n'+d.text).join('\n\n').slice(0,30000),sources:documents.map(d=>d.url),notice:'Resumen basado en la documentación pública del proyecto o en la presentación de su creador. Las funciones descritas son las declaradas por sus autores.'};
}
