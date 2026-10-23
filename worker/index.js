const SOURCES={juegos:[{name:'VidaExtra',url:'https://www.vidaextra.com/index.xml'}],politica:[{name:'elDiario.es',url:'https://www.eldiario.es/rss/politica/'}],baloncesto:[{name:'Mundo Deportivo',url:'https://www.mundodeportivo.com/feed/rss/baloncesto'}],ia:[{name:'Xataka · IA',url:'https://www.xataka.com/tag/inteligencia-artificial/rss2.xml'}],informatica:[{name:'Xataka',url:'https://www.xataka.com/index.xml'},{name:'Xataka · Computación cuántica',url:'https://www.xataka.com/tag/computacion-cuantica/rss2.xml'},{name:'Xataka · Semiconductores',url:'https://www.xataka.com/tag/semiconductores/rss2.xml'},{name:'Microsiervos',url:'https://www.microsiervos.com/index.xml'}],proyectos:[{name:'Show HN',type:'projects',url:'https://hn.algolia.com/api/v1/search_by_date'}]};
const cache=new Map();
export function decode(v=''){return v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const p=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return p>0&&p<=0x10ffff?String.fromCodePoint(p):'';}).replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
function plain(v){return decode(decode(v).replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();}
function tag(xml,name){return(xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))||[])[1]||'';}
function safeUrl(v){try{const u=new URL(decode(v).trim());return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function parseFeed(xml,source,category){return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(([,item])=>{const description=tag(item,'description')||tag(item,'content:encoded');const media=(item.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["']([^"']+)["']/i)||[])[1];const embedded=(decode(description).match(/<img\b[^>]*src=["']([^"']+)["']/i)||[])[1];const t=Date.parse(tag(item,'pubDate')||tag(item,'dc:date'));return{title:plain(tag(item,'title')),url:safeUrl(tag(item,'link')),description:plain(description).slice(0,280),image:safeUrl(media||embedded),source:source.name,category,publishedAt:Number.isFinite(t)?new Date(t).toISOString():null};}).filter(a=>a.title&&a.url);}
export function categoryFilter(a,c){
 if(c==='juegos')return !/^\/(cine|series|comics|anime)(\/|$)/i.test(new URL(a.url).pathname);
 if(c==='informatica'){
  if(/[, :]an[aá]lisis:/i.test(a.title))return false;
  if(/\b(ofert[ao]s?|descuent[ao]s?|chollos?|cupones|reacondicionados?|necr[oó]polis|arqueolog[ií]a|recetas)\b/i.test(a.title))return false;
  return /\b(tecnolog[ií]a|prototipo[s]?|rob[oó]t(?:ica|icos?|icas?)|robots?|chips?|semiconductores?|procesador(?:es)?|computaci[oó]n|cu[aá]ntic[oa]s?|fot[oó]nic[oa]s?|superordenador(?:es)?|nan[oó]metros?|fusi[oó]n|bater[ií]as?|energ[ií]a|solar(?:es)?|nuclear(?:es)?|superconductores?|sat[eé]lites?|espacial(?:es)?|cohetes?|telecomunicaciones|6g|5g|redes|windows|linux|macos|software|hardware|programaci[oó]n|c[oó]digo|inform[aá]tica|ordenador(?:es)?|nvidia|amd|intel|tsmc|litograf[ií]a|servidor(?:es)?|ciberseguridad|inteligencia artificial|automatizaci[oó]n|impresi[oó]n 3d)\b/i.test(a.title+' '+a.description);
 }
 return true;
}
export function parseProjects(hits){
 return hits.filter(h=>Number(h.points)>=50 && /\b(AI|LLM|GPT|ChatGPT|Claude|Gemini|agents?|vibe.cod(?:ing|ed)|artificial intelligence|machine learning)\b/i.test((h.title||'')+' '+(h.story_text||''))).map(h=>{
 const discussionUrl='https://news.ycombinator.com/item?id='+encodeURIComponent(h.objectID);
 const timestamp=Date.parse(h.created_at);
 return {title:plain(h.title||'').replace(/^Show HN:\s*/i,''),url:safeUrl(h.url)||discussionUrl,description:'Proyecto presentado por '+plain(h.author||'su creador')+'. '+Number(h.points)+' puntos y '+Number(h.num_comments||0)+' comentarios en Hacker News. Publicación original en inglés.',image:'',source:'Show HN · Hacker News',category:'proyectos',publishedAt:Number.isFinite(timestamp)?new Date(timestamp).toISOString():null,points:Number(h.points),comments:Number(h.num_comments||0),discussionUrl};
 }).filter(a=>a.title);
}
async function fetchProjects(){
 const since=Math.floor(Date.now()/1000)-90*86400;
 const queries=['AI','Claude','vibe coding'];
 const responses=await Promise.allSettled(queries.map(async query=>{
  const params=new URLSearchParams({tags:'show_hn',query,hitsPerPage:'50',numericFilters:'points>=50,created_at_i>'+since});
  const response=await fetch('https://hn.algolia.com/api/v1/search_by_date?'+params,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Proyectos no disponibles');const data=await response.json();if(!Array.isArray(data.hits))throw Error('Respuesta no válida');return data.hits;
 }));
 if(responses.every(r=>r.status==='rejected'))throw Error('Proyectos no disponibles');
 return parseProjects(responses.flatMap(r=>r.status==='fulfilled'?r.value:[]));
}
async function fetchFeed(s,c){if(s.type==='projects')return fetchProjects();const r=await fetch(s.url,{headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'MiDiario/1.0 (personal RSS reader)'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Fuente no disponible');const xml=await r.text();if(xml.length>5000000)throw Error('Fuente demasiado grande');const a=parseFeed(xml,s,c).filter(a=>categoryFilter(a,c));if(!a.length)throw Error('Sin artículos');return a;}
async function news(c){const old=cache.get(c);if(old&&Date.now()-old.time<300000)return {...old.data,cached:true};const results=await Promise.allSettled(SOURCES[c].map(s=>fetchFeed(s,c)));const a=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);if(!a.length&&old)return {...old.data,stale:true,warning:'La fuente no responde. Se muestra la última consulta disponible.'};const articles=[...new Map(a.map(i=>[i.url,i])).values()].sort((a,b)=>c==='proyectos'?(b.points-a.points||Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0)):Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0)).slice(0,50);const data={articles,updatedAt:new Date().toISOString(),warning:results.some(r=>r.status==='rejected')?'No se ha podido consultar la fuente. Vuelve a intentarlo o abre el medio original.':null};if(a.length)cache.set(c,{time:Date.now(),data});return data;}
export function createWorker(HTML){return {async fetch(request){const u=new URL(request.url);if(request.method!=='GET')return new Response('Método no permitido',{status:405,headers:{Allow:'GET'}});if(u.pathname==='/api/health')return Response.json({app:'mi-diario',version:4});if(u.pathname==='/api/news'){const c=u.searchParams.get('category')||'juegos';if(!Object.hasOwn(SOURCES,c))return Response.json({error:'Categoría no válida'},{status:400});return Response.json(await news(c),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}if(u.pathname!=='/'&&u.pathname!=='/index.html')return new Response('Página no encontrada',{status:404});return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: http: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"}});}};}
export default createWorker('');
