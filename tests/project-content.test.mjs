import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicAddress,publicUrl,readPublicPage,projectText,projectContent} from '../scripts/project-content.mjs';
test('La documentación externa rechaza direcciones privadas y locales, incluidas IPv6',async()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.2','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700::1111'),true);
 for(const url of ['https://localhost/a','https://127.0.0.1/a','https://[::1]/a','http://example.com','https://example.com:8443','https://a.internal','https://name:secret@example.com']){assert.equal(publicUrl(url),false);await assert.rejects(()=>readPublicPage(url));}
});
test('Un proyecto de GitHub se resume con el README y no con los votos de Show HN',async()=>{
 const urls=[];const result=await projectContent({url:'https://github.com/example/project',category:'proyectos'},async url=>{urls.push(url);return {url,contentType:'text/plain',body:'# Project\nAn open-source desktop canvas where developers and AI agents design software together. Connect a coding agent, draw diagrams, review semantic diffs and jump from architecture diagrams to source code.\n```sh\nnever execute this\n```'};});
 assert.equal(urls[0],'https://api.github.com/repos/example/project/readme');assert.equal(result.basis,'documentation');assert.match(result.text,/semantic diffs/);assert.ok(!result.text.includes('never execute'));
});
test('El lector sigue enlaces de documentación del proyecto y recoge listas y encabezados',async()=>{
 const calls=[];const result=await projectContent({url:'https://project.example.com',category:'proyectos'},async url=>{
  calls.push(url);return {url,contentType:'text/html',body:url.includes('/docs')?'<main><h1>How the project works</h1><ul><li>Build offline applications with a local SQLite database and portable HTML files.</li><li>Share your app and its data as one file without a hosting server.</li></ul></main>':'<body><h1>Portable applications</h1><p>Create and share personal web apps that run locally and keep all data on your own device.</p><a href="/docs">Documentation</a><a href="http://127.0.0.1/private">Docs</a></body>'};
 });
 assert.deepEqual(calls,['https://project.example.com','https://project.example.com/docs']);assert.match(result.text,/SQLite/);assert.equal(result.sources.length,2);
});
test('Cuando falla el sitio se lee la presentación del creador sin atribuir opiniones a comentarios no leídos',async()=>{
 const result=await projectContent({url:'https://project.example.com',discussionUrl:'https://news.ycombinator.com/item?id=123',category:'proyectos'},async url=>{if(!url.includes('algolia'))throw Error('Bloqueado');return {url,contentType:'application/json',body:JSON.stringify({text:'<p>I created a visual tool to inspect how language models behave. It lets researchers compare outputs, select examples and explore the effect of different prompts in their experiments.</p>',children:[{text:'A comment not used'}]})};});
 assert.equal(result.basis,'documentation');assert.match(result.text,/visual tool/);assert.ok(!result.text.includes('A comment not used'));
 assert.equal(await projectContent({url:'https://project.example.com'},async()=>{throw Error('No disponible');}),null);
});
