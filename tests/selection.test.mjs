import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {combineNews,selectRecent,applyAnalysis} from '../worker/selection.js';
import {createAnalysisService} from '../scripts/chatgpt.mjs';
import {allNews,createWorker} from '../worker/index.js';

const article=(url,category='juegos')=>({url,title:'Noticia real',description:'Un extracto.',source:'Prueba',category,publishedAt:'2026-10-24T10:00:00Z'});
test('La selección reúne categorías sin duplicar enlaces compartidos',()=>{
 const articles=combineNews([{articles:[article('https://example.com/a','ia')]},{articles:[article('https://example.com/a','informatica'),article('https://example.com/b','juegos')]}]);
 assert.equal(articles.length,2);assert.deepEqual(articles[0].categories,['ia','informatica']);
});
test('La selección provisional favorece actualidad sin simular un análisis de IA',()=>{
 const recent=article('https://example.com/a');
 const old={...article('https://example.com/b'),publishedAt:'2025-01-01T00:00:00Z'};
 const results=selectRecent([old,recent],Date.parse('2026-10-24T12:00:00Z'));
 assert.equal(results[0].url,recent.url);assert.match(results[0].selectionReason,/sin IA/);assert.equal(results[0].importance,undefined);
});
test('El análisis exige cobertura completa e identificadores y puntuaciones válidos',()=>{
 const articles=[article('https://example.com/a'),article('https://example.com/b')];
 const assessments=[{id:0,score:40,reason:'Impacto limitado.'},{id:1,score:90,reason:'Consecuencias amplias.'}];
 assert.equal(applyAnalysis(articles,assessments)[0].url,articles[1].url);
 for(const bad of [assessments.slice(0,1),[assessments[0],assessments[0]],[assessments[0],{...assessments[1],score:101}],[assessments[0],{...assessments[1],id:3}]])assert.throws(()=>applyAnalysis(articles,bad));
});
test('El análisis procesa todas las noticias por lotes, evita trabajo duplicado y conserva el resultado si falla',async()=>{
 let calls=0,fail=false;
 const articles=Array.from({length:51},(_,i)=>article('https://example.com/'+i));
 const service=createAnalysisService({persist:false,getNews:async()=>({articles,coverage:[]}),run:async(args,prompt)=>{
  calls++;assert.ok(args.includes('read-only'));assert.ok(args.includes('--ignore-user-config'));
  if(fail)throw Error('Fuente caída');
  const batch=JSON.parse(prompt.split('DATOS:\n')[1]);
  return JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({assessments:batch.map(a=>({id:a.id,score:a.id,reason:'Una razón concreta.'}))})}})+'\n';
 }});
 const wait=async()=>{for(let i=0;i<200&&service.status().state==='running';i++)await new Promise(resolve=>setTimeout(resolve,10));};
 service.start();service.start();await wait();
 assert.equal(service.status().state,'completed');assert.equal(calls,2);assert.equal(service.status().result.total,51);
 service.start();await wait();assert.equal(calls,2);
 fail=true;articles[0].title='Un titular nuevo';service.start();await wait();assert.equal(service.status().state,'failed');assert.equal(service.status().result.total,51);
});
test('Todos los scripts del cliente compilan y existe la nueva sección',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const [,script]of html.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new Function(script));
 assert.match(html,/data-category="importantes"/);assert.doesNotMatch(html,/id="analyzeAll"|analysis-panel|Por qué destaca/);
});
test('La API agregada consulta las seis categorías y comunica cobertura parcial',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async url=>{
   if(url.includes('eldiario'))throw Error('Fuente caída');
   if(url.includes('algolia'))return Response.json({hits:[{objectID:'123',title:'Show HN: AI app',points:80,created_at:'2026-10-24T10:00:00Z',url:'https://example.com/project'}]});
   return new Response('<rss><channel><item><title>Un nuevo chip</title><description>Un avance tecnológico</description><link>https://example.com/'+encodeURIComponent(url)+'</link><pubDate>Sat, 24 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>');
  };
  const data=await allNews();assert.equal(data.coverage.length,6);assert.ok(data.warning);assert.equal(data.coverage.find(c=>c.category==='politica').count,0);assert.ok(data.articles.some(a=>a.category==='proyectos'));
  const response=await createWorker('').fetch(new Request('https://test/api/news?category=importantes'));
  assert.equal(response.status,200);const selection=await response.json();assert.equal(selection.selectionMode,'automatic');assert.ok(selection.articles.length>0);assert.equal(selection.coverage.length,6);
 }finally{globalThis.fetch=original;}
});
