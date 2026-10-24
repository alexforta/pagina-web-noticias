import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../worker/index.js';
test('La fuente busca Show HN sin palabras de IA y aplica el mínimo de repercusión',async()=>{
 const original=globalThis.fetch;let requested;
 try{
  globalThis.fetch=async url=>{requested=new URL(url);return Response.json({hits:[{title:'Show HN: A handmade puzzle',points:50,objectID:'100',url:'https://example.com/puzzle',created_at:'2026-10-24T10:00:00Z'},{title:'Show HN: A garden',points:49,objectID:'101'}]});};
  const data=await (await createWorker('').fetch(new Request('https://test/api/news?category=proyectos'))).json();
  assert.equal(requested.searchParams.get('tags'),'show_hn');assert.equal(requested.searchParams.has('query'),false);assert.match(requested.searchParams.get('numericFilters'),/^points>=50,created_at_i>/);assert.equal(data.articles.length,1);assert.equal(data.articles[0].title,'A handmade puzzle');
 }finally{globalThis.fetch=original;}
});
