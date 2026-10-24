import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import '../news-library.js';
import {createWorker} from '../worker/index.js';
const {sortArticles,parseFavorites,savedArticle}=globalThis.NewsLibrary;
const article={url:'https://www.xataka.com/a',title:'Una noticia guardada',description:'Extracto',source:'Xataka',category:'ia',publishedAt:'2026-10-24T10:00:00Z'};
test('El orden cronológico funciona en ambos sentidos y deja las fechas desconocidas al final',()=>{
 const recent={...article,title:'Nueva'},old={...article,title:'Antigua',publishedAt:'2025-01-01T00:00:00Z'},missing={...article,title:'Sin fecha',publishedAt:null},same={...recent,title:'Misma fecha'};
 const input=[missing,recent,same,old];assert.deepEqual(sortArticles(input,'newest').map(a=>a.title),['Nueva','Misma fecha','Antigua','Sin fecha']);assert.deepEqual(sortArticles(input,'oldest').map(a=>a.title),['Antigua','Nueva','Misma fecha','Sin fecha']);assert.equal(input[0],missing);
});
test('Los favoritos se recuperan de los datos guardados sin duplicados ni enlaces inseguros',()=>{
 const saved=JSON.stringify([article,{...article,title:'Actualizada'},{...article,url:'javascript:alert(1)'},{...article,category:'constructor'},null]);const result=parseFavorites(saved);assert.equal(result.length,1);assert.equal(result[0].title,'Actualizada');assert.equal(parseFavorites('invalid json').length,0);assert.equal(parseFavorites('{}').length,0);assert.equal(savedArticle(null),null);
 assert.equal(savedArticle({...article,image:'javascript:alert(1)'}).image,'');assert.equal(savedArticle({...article,publishedAt:'invalid'}).publishedAt,null);
});
test('El Worker sirve la biblioteca local con JavaScript y una política que permite cargarla',async()=>{
 const script=await readFile(new URL('../news-library.js',import.meta.url),'utf8');const worker=createWorker('Página','Resumen',script);
 const response=await worker.fetch(new Request('https://test/news-library.js'));assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);assert.equal(await response.text(),script);
 const page=await worker.fetch(new Request('https://test/'));assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
});
