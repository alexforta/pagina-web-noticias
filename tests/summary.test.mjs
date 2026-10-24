import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allowedArticleUrl,extractArticle,articleContent,createSummaryService} from '../scripts/summaries.mjs';
import {createWorker} from '../worker/index.js';
const article={url:'https://www.xataka.com/tecnologia/avance',title:'Un avance tecnológico',source:'Xataka',category:'informatica',description:'El medio anuncia un nuevo avance tecnológico.'};
const paragraph='Un equipo ha desarrollado un prototipo que reduce el consumo energético durante las pruebas de laboratorio. Todavía se necesitan más ensayos para comprobar su funcionamiento fuera del laboratorio.';
test('El lector extrae párrafos del artículo y elimina scripts, navegación y duplicados',()=>{
 const html='<nav><p>'+paragraph+'</p></nav><article><script>malicioso</script><p>'+paragraph+'</p><p>'+paragraph+'</p><p>Suscríbete a nuestra newsletter para recibir todas las noticias de tecnología directamente en tu correo electrónico.</p></article>';
 assert.equal(extractArticle(html),paragraph);assert.equal(extractArticle('<p>Sin artículo</p>'),'');
});
test('Solo se consultan medios conocidos y no se siguen redirecciones a redes privadas',async()=>{
 for(const url of ['http://www.xataka.com/a','https://127.0.0.1/a','https://xataka.com.evil.test/a','https://user:pass@xataka.com/a','https://xataka.com:8443/a'])assert.equal(allowedArticleUrl(url),false);
 let calls=0;const result=await articleContent(article,async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});});
 assert.equal(calls,1);assert.equal(result.basis,'excerpt');assert.equal(result.text,article.description);
});
test('El contenido restringido usa el extracto y el texto accesible usa el artículo',async()=>{
 const denied=await articleContent(article,async()=>new Response('',{status:403}));assert.equal(denied.basis,'excerpt');
 const available=await articleContent(article,async()=>new Response('<article><p>'+paragraph+'</p><p>'+paragraph+' Los ensayos continuarán durante los próximos meses.</p></article>',{headers:{'content-type':'text/html'}}));assert.equal(available.basis,'article');assert.ok(available.text.includes('ensayos'));
});
test('El resumen genera texto y puntos clave, reutiliza resultados y rechaza noticias desconocidas',async()=>{
 let calls=0;
 const service=createSummaryService({resolveArticle:async url=>url===article.url?article:null,content:async()=>({text:paragraph,basis:'article',notice:'Texto accesible.'}),run:async(args,prompt)=>{calls++;assert.ok(args.includes('read-only'));assert.match(prompt,/no confiables/);return JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({summary:'Un equipo presenta un prototipo de menor consumo que necesita más pruebas.',keyPoints:['Se trata de un prototipo.','Quedan ensayos pendientes.']})}});}});
 const wait=async url=>{for(let i=0;i<100&&service.status(url).state==='running';i++)await new Promise(r=>setTimeout(r,10));};
 service.start(article.url,'informatica');service.start(article.url,'informatica');await wait(article.url);assert.equal(calls,1);assert.equal(service.status(article.url).mode,'chatgpt');assert.equal(service.status(article.url).keyPoints.length,2);
 service.start(article.url,'informatica');assert.equal(calls,1);
 service.start('https://unknown.test/a');await wait('https://unknown.test/a');assert.equal(service.status('https://unknown.test/a').state,'failed');assert.equal(calls,1);
});
test('Si ChatGPT falla, muestra un extracto identificado y conserva el enlace al original',async()=>{
 const service=createSummaryService({resolveArticle:async()=>article,content:async()=>({text:paragraph,basis:'article'}),run:async()=>{throw Error('Sin conexión');}});
 service.start(article.url);for(let i=0;i<100&&service.status(article.url).state==='running';i++)await new Promise(r=>setTimeout(r,10));
 const result=service.status(article.url);assert.equal(result.state,'completed');assert.equal(result.mode,'excerpt');assert.equal(result.summary,article.description);assert.equal(result.article.url,article.url);
});
test('Una noticia favorita puede abrir su resumen aunque ya no aparezca en el RSS',async()=>{
 const service=createSummaryService({resolveArticle:async()=>null,content:async saved=>{assert.equal(saved.url,article.url);return {text:paragraph,basis:'article',notice:'Texto accesible.'};},run:async()=>JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({summary:'Resumen de la noticia guardada.',keyPoints:['Un dato documentado.']})}})});
 service.start(article.url,article.category,article);for(let i=0;i<100&&service.status(article.url).state==='running';i++)await new Promise(r=>setTimeout(r,10));assert.equal(service.status(article.url).state,'completed');assert.equal(service.status(article.url).article.title,article.title);
 service.start('https://www.xataka.com/otra',article.category,article);for(let i=0;i<100&&service.status('https://www.xataka.com/otra').state==='running';i++)await new Promise(r=>setTimeout(r,10));assert.equal(service.status('https://www.xataka.com/otra').state,'failed');
});
test('Las tarjetas enlazan a la página de resumen y ambas páginas tienen JavaScript válido',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const summary=await readFile(new URL('../summary.html',import.meta.url),'utf8');
 assert.match(html,/cover.href=summaryUrl/);assert.match(html,/link.href=summaryUrl/);assert.match(html,/read.href=summaryUrl/);assert.ok(!html.includes('Leer en el medio original ↗'));
 for(const page of [html,summary])for(const [,script]of page.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new Function(script));
 const response=await createWorker(html,summary).fetch(new Request('https://test/noticia?url=https%3A%2F%2Fwww.xataka.com%2Fa'));assert.equal(response.status,200);assert.equal(await response.text(),summary);
});
