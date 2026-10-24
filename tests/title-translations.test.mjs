import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTitleTranslator,validateTranslations} from '../scripts/title-translations.mjs';
test('El esquema de salida enviado a Codex es JSON válido',async()=>{
 const schema=JSON.parse(await readFile(new URL('../title-translations.schema.json',import.meta.url),'utf8'));assert.equal(schema.properties.translations.items.properties.title.type,'string');
});
test('Las traducciones deben cubrir todos los titulares sin identificadores duplicados o títulos vacíos',()=>{
 const titles=['The AI tool','A new app'];assert.deepEqual(validateTranslations([{id:1,title:'Una aplicación nueva'},{id:0,title:'La herramienta de IA'}],titles),['La herramienta de IA','Una aplicación nueva']);
 for(const entries of [[{id:0,title:'Uno'}],[{id:0,title:'Uno'},{id:0,title:'Dos'}],[{id:0,title:'Uno'},{id:1,title:''}],[{id:0,title:'Uno'},{id:9,title:'Dos'}]])assert.throws(()=>validateTranslations(entries,titles));
});
test('Se traducen los proyectos, se conserva el original y se reutiliza la caché entre la lista y el resumen',async()=>{
 let calls=0;
 const translator=createTitleTranslator({persist:false,run:async(args,prompt)=>{
  calls++;assert.ok(args.includes('read-only'));const titles=JSON.parse(prompt.split('DATOS:\n')[1]);
  return JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({translations:titles.map(t=>({id:t.id,title:'Whiteboard: un entorno de código abierto para diseñar software'}))})}});
 }});
 const english={title:'Whiteboard: an open-source IDE for software design',category:'proyectos',url:'https://github.com/example/project'},spanish={title:'Un avance tecnológico',category:'ia'};
 const [first,second]=await Promise.all([translator.translate([english,spanish]),translator.translate([english])]);
 assert.equal(calls,1);assert.match(first[0].title,/un entorno de código abierto/);assert.equal(first[0].originalTitle,english.title);assert.equal(first[1].title,spanish.title);assert.equal(second[0].title,first[0].title);
 assert.equal((await translator.translate([english]))[0].title,first[0].title);assert.equal(calls,1);
});
test('Los fallos no guardan resultados incompletos ni reemplazan el título original',async()=>{
 let calls=0;const translator=createTitleTranslator({persist:false,run:async()=>{calls++;return JSON.stringify({type:'turn.failed'});}});
 const article={title:'The AI tool',category:'proyectos'};await assert.rejects(()=>translator.translate([article]));await assert.rejects(()=>translator.translate([article]));assert.equal(calls,2);assert.equal(article.title,'The AI tool');
});
